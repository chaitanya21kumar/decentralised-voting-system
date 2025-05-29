// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

 contract Voting is ReentrancyGuard {
    address public superAdmin; // Primary administrator
    uint256 public candidateCount;
    uint256 public voterCount;
    uint256 public votingStart;
    uint256 public votingEnd;
    bool public isPaused;
    
    string public didRegistryCID; // IPFS CID for off-chain voter DID registry

    struct Candidate {
        uint256 candidateId;
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
        address voterAddress;
        string name;
        string phone;
        string did; // DID of the voter
        bool isVerified;
        bool isRegistered;
    }

    ElectionDetails public Election;
    mapping(address => Voter) private Voters;
    mapping(uint256 => Candidate) public Candidates;
    mapping(address => bool) public admins;
    mapping(bytes32 => bool) private candidateNameExists;
    mapping(address => bool) private hasVoted;

    event CandidateAdded(uint256 candidateId, string name, string slogan);
    event VoterRegistered(address voterAddress, string name);
    event VoterVerified(address voterAddress, bool status);
    event VoteCast(address voter, uint256 candidateId);
    event ElectionStarted(uint256 startTime, uint256 endTime);
    event ElectionEnded(uint256 endTime);
    event WinnerDeclared(uint256 candidateId, string name, uint256 votes);
    event AdminAdded(address adminAddress);
    event AdminRemoved(address adminAddress);
    event ElectionDetailsUpdated(string field, string newValue);
    event ContractPaused(bool isPaused);
    event DIDRegistryUpdated(string cid);

    modifier isSuperAdmin() {
        require(msg.sender == superAdmin, "Only super admin allowed");
        _;
    }

    modifier isAdmin() {
        require(admins[msg.sender], "Only admin allowed");
        _;
    }

    modifier onlyWhenVotingActive() {
        require(block.timestamp >= votingStart && block.timestamp <= votingEnd, "Voting is not active");
        _;
    }

    modifier onlyWhenVotingEnded() {
        require(block.timestamp > votingEnd, "Voting has not ended");
        _;
    }

    modifier notPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }

    // Constructor - Takes IPFS CID for DID Registry
    constructor(string memory _didRegistryCID) {
        superAdmin = msg.sender;
        admins[msg.sender] = true;
        didRegistryCID = _didRegistryCID;
        emit DIDRegistryUpdated(_didRegistryCID);
    }

    // Update DID Registry CID (if needed)
    function updateDIDRegistry(string memory _newCID) external isSuperAdmin {
        didRegistryCID = _newCID;
        emit DIDRegistryUpdated(_newCID);
    }

    function getDIDRegistryCID() public view returns (string memory) {
        return didRegistryCID;
    }

    // Admin Management
    function addAdmin(address adminAddress) external isSuperAdmin {
        require(!admins[adminAddress], "Already an admin");
        admins[adminAddress] = true;
        emit AdminAdded(adminAddress);
    }

    function removeAdmin(address adminAddress) external isSuperAdmin {
        require(admins[adminAddress], "Not an admin");
        admins[adminAddress] = false;
        emit AdminRemoved(adminAddress);
    }

    // Election Management
    function setElectionDetails(
        string memory adminName,
        string memory adminEmail,
        string memory adminTitle,
        string memory electionTitle,
        string memory organizationTitle,  
        uint256 maxVotes
    ) external isAdmin {
        Election = ElectionDetails({
            adminName: adminName,
            adminEmail: adminEmail,
            adminTitle: adminTitle,
            electionTitle: electionTitle,
            organizationTitle: organizationTitle,
            maxVotesPerCandidate: maxVotes
        });
    }

    function startElection(uint256 durationInMinutes) external isAdmin notPaused {
        require(votingStart == 0 || block.timestamp > votingEnd, "Previous election ongoing");
        votingStart = block.timestamp;
        votingEnd = votingStart + (durationInMinutes * 1 minutes);
        emit ElectionStarted(votingStart, votingEnd);
    }

    function endElection() external isAdmin notPaused {
        require(block.timestamp >= votingEnd, "Voting time not over");
        votingStart = 0;
        votingEnd = 0;
        emit ElectionEnded(block.timestamp);
    }

    // Candidate Management 
    function addCandidate(string memory name, string memory slogan) external isAdmin notPaused {
        require(bytes(name).length > 0, "Candidate name required");
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        // Check using mapping for duplicate candidate names
        require(!candidateNameExists[nameHash], "Duplicate candidate name");
        
        Candidates[candidateCount] = Candidate(candidateCount, name, slogan, 0);
        candidateNameExists[nameHash] = true; // Mark candidate name as added
        emit CandidateAdded(candidateCount, name, slogan);
        candidateCount++;
    }

    // Voter Management
    function registerVoter(string memory name, string memory phone, string memory did) external notPaused {
        require(!Voters[msg.sender].isRegistered, "Already registered");
        Voters[msg.sender] = Voter(msg.sender, name, phone, did, false, true);
        voterCount++;
        emit VoterRegistered(msg.sender, name);
    }

    function verifyVoter(address voterAddress, string memory did) external isAdmin notPaused {
        require(Voters[voterAddress].isRegistered, "Voter not registered");

        // Fetch voter DID from IPFS (Off-chain validation happens here)
        // This is done in the frontend using `didRegistryCID`

        require(keccak256(abi.encodePacked(Voters[voterAddress].did)) == keccak256(abi.encodePacked(did)), "DID mismatch");

        Voters[voterAddress].isVerified = true;
        emit VoterVerified(voterAddress, true);
    }

    // Voting with Reentrancy Guard for security improvement
    function vote(uint256 candidateId) external onlyWhenVotingActive notPaused nonReentrant {
        require(Voters[msg.sender].isVerified, "Not verified");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateId < candidateCount, "Invalid candidate");
        require(Candidates[candidateId].votes < Election.maxVotesPerCandidate, "Vote limit reached");
        Candidates[candidateId].votes++;
        hasVoted[msg.sender] = true;
        emit VoteCast(msg.sender, candidateId);
    }

    // Utility Functions
    function pauseContract(bool pause) external isSuperAdmin {
        isPaused = pause;
        emit ContractPaused(pause);
    }

    function declareWinner() external view isAdmin onlyWhenVotingEnded returns (uint256 winnerId, string memory winnerName, uint256 maxVotes) {
        uint256 maxVoteCount = 0;
        uint256 winnerIdx = 0;
        for (uint256 i = 0; i < candidateCount; i++) {
            if (Candidates[i].votes > maxVoteCount) {
                maxVoteCount = Candidates[i].votes;
                winnerIdx = i;
            }
        }
        return (winnerIdx, Candidates[winnerIdx].name, maxVoteCount);
    }
    function getCandidateCount() public view returns (uint256) {
        return candidateCount;
    }
}
