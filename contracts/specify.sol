// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Election {
    address public admin; // Electoral official's address

    enum UserRole { Voter, Contestant, ElectoralOfficial }


    enum VoterStatus {
        NotRegistered,
        Registered,
        Voted
    }
    enum CandidateStatus {
        NotRegistered,
        Registered
    }

    struct User {
        UserRole role;
        bool registered;
    }

    struct Voter {
        VoterStatus status;
        uint256 ballotId; // Unique identifier for the voter's ballot
    }

    struct Candidate {
        CandidateStatus status;
        string name;
         uint256 age;
        string manifesto;
        uint256 voteCount;
    }
    mapping(address => User) public users;

    mapping(address => Voter) public voters;
    mapping(address => Candidate) public candidates;
    bool public electionClosed;
    address[] public candidateAddresses; // Separate array to store registered candidate addresses

    event VoterRegistered(address indexed voter);
    event CandidateRegistered(address indexed candidate);
    event VoteCast(address indexed voter, address indexed candidate);
    event ElectionClosed();
    event ElectionResults(address[] candidates, uint256[] voteCounts);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyRegisteredVoter() {
        require(
            voters[msg.sender].status == VoterStatus.Registered,
            "Only registered voters can call this function"
        );
        _;
    }

    modifier onlyNotVoted() {
        require(
            voters[msg.sender].status == VoterStatus.Registered,
            "Voter has already voted"
        );
        _;
    }

     modifier onlyElectoralOfficial() {
        require(users[msg.sender].role == UserRole.ElectoralOfficial, "Only electoral officials can call this function");
        _;
    }

    modifier onlyNotRegisteredVoter(address _voter) {
        require(
            voters[_voter].status == VoterStatus.NotRegistered,
            "Voter already registered"
        );
        _;
    }

    modifier onlyNotRegisteredCandidate(address _candidate) {
        require(
            candidates[_candidate].status == CandidateStatus.NotRegistered,
            "Candidate already registered"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerVoter(address _voter)
        external
        onlyAdmin
        onlyNotRegisteredVoter(_voter)
    {
        voters[_voter].status = VoterStatus.Registered;
        emit VoterRegistered(_voter);
    }

    function registerCandidate(
    address _candidate,
    string memory _name,
    uint256 _age,
    string memory _manifesto
) external onlyAdmin onlyNotRegisteredCandidate(_candidate) {
    candidates[_candidate] = Candidate(
        CandidateStatus.Registered,
        _name,
        _age,
        _manifesto,
        0
    );
    candidateAddresses.push(_candidate); // Add the registered candidate address to the array
    emit CandidateRegistered(_candidate);
}
    function vote(address _candidate)
        external
        onlyRegisteredVoter
        onlyNotVoted
    {
        require(
            candidates[_candidate].status == CandidateStatus.Registered,
            "Invalid candidate"
        );

        voters[msg.sender].status = VoterStatus.Voted;
        candidates[_candidate].voteCount += 1;
        emit VoteCast(msg.sender, _candidate);
    }

    // Function to display election status
    function displayElectionStatus() external view returns (bool closed) {
        return electionClosed;
    }

    // Get the details of a specific candidate
    function getCandidateDetails(address _candidate) external view returns (string memory name, string memory manifesto, uint256 voteCount) {
        require(candidates[_candidate].status == CandidateStatus.Registered, "Candidate not registered");
        return (candidates[_candidate].name, candidates[_candidate].manifesto, candidates[_candidate].voteCount);
    }


    // Display voting history
    function displayVotingHistory() external view onlyRegisteredVoter returns (uint256) {
        return voters[msg.sender].ballotId;
    }

    // Display election results
    function displayElectionResults() external view returns (uint256[] memory) {
        require(electionClosed, "Election is not closed");
        uint256[] memory results = new uint256[](candidateAddresses.length);

        for (uint256 i = 0; i < candidateAddresses.length; i++) {
            results[i] = candidates[candidateAddresses[i]].voteCount;
        }

        return results;
    }


    // Function to add an electoral official
    function addElectoralOfficial(address _official) external onlyAdmin {
        require(users[_official].role == UserRole.ElectoralOfficial, "Address must belong to an electoral official");
        require(!users[_official].registered, "Electoral official already registered");
        
        users[_official].registered = true;
        users[_official].role = UserRole.ElectoralOfficial;
    }

    function closeElection() external onlyAdmin {
        // Additional checks for ensuring a secure and complete election process can be added here
        electionClosed = true;
        emit ElectionClosed();
    }

    function getElectionResults() external onlyAdmin {
        require(hasElectionClosed(), "Election is still ongoing");

        //address[]
       //     memory candidateAddresses = getRegisteredCandidatesAddresses();
        uint256[] memory voteCounts = new uint256[](candidateAddresses.length);

        for (uint256 i = 0; i < candidateAddresses.length; i++) {
            Candidate storage candidate = candidates[candidateAddresses[i]];
            voteCounts[i] = candidate.voteCount;
        }

        emit ElectionResults(candidateAddresses, voteCounts);
    }

    function getWinner()
        external
        view
        returns (address winner, uint256 voteCount)
    {
        require(hasElectionClosed(), "Election is still ongoing");

        uint256 maxVotes = 0;
        for (uint256 i = 0; i < candidateAddresses.length; i++) {
            Candidate storage candidate = candidates[candidateAddresses[i]];
            if (candidate.voteCount > maxVotes) {
                maxVotes = candidate.voteCount;
                winner = candidateAddresses[i];
            }
        }

        voteCount = maxVotes;
    }

    function hasElectionClosed() public view returns (bool) {
        return electionClosed;
    }

    function getRegisteredCandidatesAddresses()
        public
        view
        returns (address[] memory)
    {
        return candidateAddresses;
    }

    function verifyVoterRegistration(address _voter)
        external
        view
        returns (VoterStatus)
    {
        return voters[_voter].status;
    }

    function verifyDigitalIdentity(address _voter, bool _isVerified)
        external
        onlyAdmin
    {
        require(
            voters[_voter].status == VoterStatus.Registered,
            "Voter is not registered"
        );

        if (_isVerified) {
            // Assume external verification logic here
            // Set voter status to Verified if the external verification is successful
            voters[_voter].status = VoterStatus.Voted;
        }
    }
}
