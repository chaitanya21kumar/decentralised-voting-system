// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Decentralized Voting Contract
/// @notice Manages elections: candidate registration, voter registration, voting, and winner declaration
contract Voting is ReentrancyGuard {
    // --- State Variables ---
    address public superAdmin;
    bool public isPaused;
    string public didRegistryCID;

    uint256 public candidateCount;
    uint256 public voterCount;
    uint256 public totalVotesCast;
    uint256 public votingStart;
    uint256 public votingEnd;
    bool public detailsSet;

    struct Candidate {
        uint256 id;
        string name;
        string slogan;
        uint256 votes;
    }

    struct ElectionDetails {
        string adminName;
        string adminEmail;
        string adminTitle;
        string electionTitle;
        string organizationTitle;
        uint256 maxVotesPerCandidate;
    }

    struct Voter {
        address account;
        string name;
        string phone;
        string did;
        bool isVerified;
        bool isRegistered;
    }

    ElectionDetails public election;
    mapping(address => Voter) private voters;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public admins;
    mapping(bytes32 => bool) private candidateNameExists;
    mapping(address => bool) private hasVoted;

    // --- Events ---
    event DIDRegistryUpdated(string cid);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event ElectionDetailsSet(string title, uint256 maxVotes);
    event ElectionStarted(uint256 startTime, uint256 endTime);
    event ElectionEnded(uint256 endTime);
    event CandidateAdded(uint256 indexed id, string name);
    event VoterRegistered(address indexed voter, string name);
    event VoterVerified(address indexed voter);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event WinnerDeclared(uint256 indexed candidateId, string name, uint256 votes);
    event ContractPaused(bool paused);

    // --- Modifiers ---
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "Only super admin");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin");
        _;
    }

    modifier notPaused() {
        require(!isPaused, "Paused");
        _;
    }

    /// @dev Automatically ends election if time expired
    modifier onlyWhenVotingActive() {
        if (votingEnd != 0 && block.timestamp > votingEnd) {
            _endElectionInternal();
        }
        require(
            votingStart != 0 &&
            block.timestamp >= votingStart &&
            block.timestamp <= votingEnd,
            "Voting not active"
        );
        _;
    }

    /// @dev Requires election period to be over
    modifier onlyWhenVotingEnded() {
        require(votingEnd != 0 && block.timestamp > votingEnd, "Voting not ended");
        _;
    }

    // --- Constructor ---
    constructor(string memory _didRegistryCID) {
        superAdmin = msg.sender;
        admins[msg.sender] = true;
        didRegistryCID = _didRegistryCID;
        emit DIDRegistryUpdated(_didRegistryCID);
    }

    // --- Admin Functions ---
    function updateDIDRegistry(string memory _cid) external onlySuperAdmin {
        didRegistryCID = _cid;
        emit DIDRegistryUpdated(_cid);
    }

    function addAdmin(address _admin) external onlySuperAdmin {
        require(!admins[_admin], "Already admin");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlySuperAdmin {
        require(admins[_admin], "Not an admin");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    // --- Election Setup ---
    function setElectionDetails(
        string memory _adminName,
        string memory _adminEmail,
        string memory _adminTitle,
        string memory _electionTitle,
        string memory _organizationTitle,
        uint256 _maxVotes
    ) external onlyAdmin notPaused {
        require(bytes(_electionTitle).length > 0, "Title required");
        require(_maxVotes > 0, "Max votes must be > 0");

        election = ElectionDetails({
            adminName: _adminName,
            adminEmail: _adminEmail,
            adminTitle: _adminTitle,
            electionTitle: _electionTitle,
            organizationTitle: _organizationTitle,
            maxVotesPerCandidate: _maxVotes
        });
        detailsSet = true;
        emit ElectionDetailsSet(_electionTitle, _maxVotes);
    }

    function startElection(uint256 durationMinutes) external onlyAdmin notPaused {
        require(detailsSet, "Details not set");
        require(votingStart == 0 || block.timestamp > votingEnd, "Ongoing election");

        votingStart = block.timestamp;
        votingEnd = votingStart + durationMinutes * 1 minutes;
        emit ElectionStarted(votingStart, votingEnd);
    }

    function endElection() external onlyAdmin notPaused onlyWhenVotingEnded {
        _endElectionInternal();
    }

    function _endElectionInternal() internal {
        // Only clear start; keep votingEnd for end-condition checks
        votingStart = 0;
        emit ElectionEnded(block.timestamp);
    }

    // --- Candidate Management ---
    function addCandidate(string memory _name, string memory _slogan) external onlyAdmin notPaused {
        require(bytes(_name).length > 0, "Name required");
        bytes32 hash = keccak256(abi.encodePacked(_name));
        require(!candidateNameExists[hash], "Duplicate candidate");

        candidates[candidateCount] = Candidate(candidateCount, _name, _slogan, 0);
        candidateNameExists[hash] = true;
        emit CandidateAdded(candidateCount, _name);
        candidateCount++;
    }

    // --- Voter Management ---
    function registerVoter(
        string memory _name,
        string memory _phone,
        string memory _did
    ) external notPaused {
        require(!voters[msg.sender].isRegistered, "Already registered");

        voters[msg.sender] = Voter(msg.sender, _name, _phone, _did, false, true);
        voterCount++;
        emit VoterRegistered(msg.sender, _name);
    }

    function verifyVoter(address _voter, string memory _did) external onlyAdmin notPaused {
        require(voters[_voter].isRegistered, "Not registered");
        require(
            keccak256(abi.encodePacked(voters[_voter].did)) == keccak256(abi.encodePacked(_did)),
            "DID mismatch"
        );

        voters[_voter].isVerified = true;
        emit VoterVerified(_voter);
    }

    // --- Voting ---
    function vote(uint256 _candidateId)
        external
        onlyWhenVotingActive
        notPaused
        nonReentrant
    {
        require(voters[msg.sender].isVerified, "Not verified");
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateId < candidateCount, "Invalid candidate");
        require(
            candidates[_candidateId].votes < election.maxVotesPerCandidate,
            "Vote limit reached"
        );

        candidates[_candidateId].votes++;
        hasVoted[msg.sender] = true;
        totalVotesCast++;
        emit VoteCast(msg.sender, _candidateId);
    }

    // --- Results ---
    function declareWinner()
        external
        onlyAdmin
        onlyWhenVotingEnded
        notPaused
        returns (
            uint256 winnerId,
            string memory winnerName,
            uint256 maxVotes
        )
    {
        uint256 highest;
        uint256 idx;
        for (uint256 i = 0; i < candidateCount; i++) {
            if (candidates[i].votes > highest) {
                highest = candidates[i].votes;
                idx = i;
            }
        }

        winnerId = idx;
        winnerName = candidates[idx].name;
        maxVotes = highest;
        emit WinnerDeclared(winnerId, winnerName, maxVotes);
    }

    // --- Pause ---
    function pauseContract(bool _pause) external onlySuperAdmin {
        isPaused = _pause;
        emit ContractPaused(_pause);
    }

    // --- Helpers ---
    function getCandidateCount() external view returns (uint256) {
        return candidateCount;
    }

    function getVoter(address _voter) external view returns (Voter memory) {
        return voters[_voter];
    }

    function getVoterTurnout() external view returns (uint256 turnoutPercentage) {
        if (voterCount == 0) return 0;
        return (totalVotesCast * 100) / voterCount;
    }
}
