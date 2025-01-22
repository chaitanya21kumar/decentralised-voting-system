// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    address public superAdmin; // Primary administrator
    uint256 public candidateCount;
    uint256 public voterCount;
    uint256 public votingStart;
    uint256 public votingEnd;
    bool public isPaused;

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
        bool isVerified;
        bool hasVoted;
        bool isRegistered;
    }

    ElectionDetails public Election;
    mapping(address => Voter) private Voters;
    mapping(uint256 => Candidate) public Candidates;
    mapping(address => bool) public admins;

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

    constructor() {
        superAdmin = msg.sender;
        admins[msg.sender] = true;
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
        for (uint256 i = 0; i < candidateCount; i++) {
            require(keccak256(abi.encodePacked(Candidates[i].name)) != keccak256(abi.encodePacked(name)), "Duplicate candidate name");
        }
        Candidates[candidateCount] = Candidate(candidateCount, name, slogan, 0);
        emit CandidateAdded(candidateCount, name, slogan);
        candidateCount++;
    }

    // Voter Management
    function registerVoter(string memory name, string memory phone) external notPaused {
        require(!Voters[msg.sender].isRegistered, "Already registered");
        Voters[msg.sender] = Voter(msg.sender, name, phone, false, false, true);
        voterCount++;
        emit VoterRegistered(msg.sender, name);
    }

    function verifyVoter(address voterAddress) external isAdmin notPaused {
        require(Voters[voterAddress].isRegistered, "Voter not registered");
        Voters[voterAddress].isVerified = true;
        emit VoterVerified(voterAddress, true);
    }

    // Voting
    function vote(uint256 candidateId) external onlyWhenVotingActive notPaused {
        require(Voters[msg.sender].isVerified, "Not verified");
        require(!Voters[msg.sender].hasVoted, "Already voted");
        require(candidateId < candidateCount, "Invalid candidate");
        require(Candidates[candidateId].votes < Election.maxVotesPerCandidate, "Vote limit reached");
        Candidates[candidateId].votes++;
        Voters[msg.sender].hasVoted = true;
        emit VoteCast(msg.sender, candidateId);
    }

    // Utility Functions
    function pauseContract(bool pause) external isSuperAdmin {
        isPaused = pause;
        emit ContractPaused(pause);
    }

    function declareWinner() external view onlyWhenVotingEnded returns (uint256 winnerId, string memory winnerName, uint256 maxVotes) {
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
}
