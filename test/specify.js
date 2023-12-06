const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Election Contract", function () {
  let Election;
  let election;
  let admin;
  let voter;
  let candidate;

  beforeEach(async function () {
    [admin, voter, candidate] = await ethers.getSigners();

    Election = await ethers.getContractFactory("Election");
    election = await Election.deploy();
    await election.deployed();

    // Register admin and voter
    await election.addElectoralOfficial(admin.address);
    await election.registerVoter(voter.address);
  });

  it("should register a voter", async function () {
    await expect(election.registerVoter(candidate.address))
      .to.emit(election, "VoterRegistered")
      .withArgs(candidate.address);

    const voterStatus = await election.verifyVoterRegistration(candidate.address);
    expect(voterStatus).to.equal(1); // VoterStatus.Registered
  });

  it("should register a candidate", async function () {
    await expect(election.registerCandidate(candidate.address, "John Doe", 30, "Manifesto"))
      .to.emit(election, "CandidateRegistered")
      .withArgs(candidate.address);

    const candidateDetails = await election.getCandidateDetails(candidate.address);
    expect(candidateDetails.name).to.equal("John Doe");
    expect(candidateDetails.manifesto).to.equal("Manifesto");
    expect(candidateDetails.voteCount).to.equal(0);
  });

  it("should allow a registered voter to vote", async function () {
    // Register a candidate
    await election.registerCandidate(candidate.address, "John Doe", 30, "Manifesto");

    // Vote for the candidate
    await expect(election.connect(voter).vote(candidate.address))
      .to.emit(election, "VoteCast")
      .withArgs(voter.address, candidate.address);

    const voterStatus = await election.verifyVoterRegistration(voter.address);
    expect(voterStatus).to.equal(2); // VoterStatus.Voted
  });

  it("should display election results", async function () {
    // Register candidates
    await election.registerCandidate(candidate.address, "Candidate 1", 25, "Manifesto 1");
    await election.registerCandidate(admin.address, "Candidate 2", 30, "Manifesto 2");

    // Vote for candidates
    await election.connect(voter).vote(candidate.address);
    await election.connect(voter).vote(admin.address);

    // Close the election
    await election.closeElection();

    // Display results
    const results = await election.displayElectionResults();
    expect(results).to.have.lengthOf(2);
    expect(results[0]).to.equal(1); // Votes for Candidate 1
    expect(results[1]).to.equal(1); // Votes for Candidate 2
  });

  it("should get the winner", async function () {
    // Register candidates
    await election.registerCandidate(candidate.address, "Candidate 1", 25, "Manifesto 1");
    await election.registerCandidate(admin.address, "Candidate 2", 30, "Manifesto 2");

    // Vote for candidates
    await election.connect(voter).vote(candidate.address);
    await election.connect(voter).vote(admin.address);

    // Close the election
    await election.closeElection();

    // Get the winner
    const [winner, voteCount] = await election.getWinner();
    expect(winner).to.equal(admin.address);
    expect(voteCount).to.equal(1); // Votes for Candidate 2
  });

  it("should not allow non-admin to register a voter", async function () {
    await expect(election.connect(voter).addElectoralOfficial(admin.address)).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow non-admin to close the election", async function () {
    await expect(election.connect(voter).closeElection()).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow a voter to vote before election is closed", async function () {
    await expect(election.connect(voter).vote(candidate.address)).to.be.revertedWith("Invalid candidate");
  });

  it("should not allow a voter to vote twice", async function () {
    // Register a candidate
    await election.registerCandidate(candidate.address, "John Doe", 30, "Manifesto");

    // Vote for the candidate
    await election.connect(voter).vote(candidate.address);

    // Try voting again
    await expect(election.connect(voter).vote(candidate.address)).to.be.revertedWith("Voter has already voted");
  });

  it("should not allow a non-registered voter to vote", async function () {
    // Register a candidate
    await election.registerCandidate(candidate.address, "John Doe", 30, "Manifesto");

    // Try voting
    await expect(election.connect(candidate).vote(candidate.address)).to.be.revertedWith("Only registered voters can call this function");
  });

  it("should not allow a non-admin to register a candidate", async function () {
    await expect(election.connect(voter).registerCandidate(candidate.address, "John Doe", 30, "Manifesto")).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow a voter to register another voter", async function () {
    await expect(election.connect(voter).registerVoter(candidate.address)).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow a candidate to register another candidate", async function () {
    await expect(election.connect(candidate).registerCandidate(admin.address, "John Doe", 30, "Manifesto")).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow a voter to register twice", async function () {
    // Register the voter
    await election.registerVoter(voter.address);

    // Try registering again
    await expect(election.registerVoter(voter.address)).to.be.revertedWith("Voter already registered");
  });

  it("should not allow a candidate to register twice", async function () {
    // Register the candidate
    await election.registerCandidate(candidate.address, "John Doe", 30, "Manifesto");

    // Try registering again
    await expect(election.registerCandidate(candidate.address, "John Doe", 30, "Manifesto")).to.be.revertedWith("Candidate already registered");
  });

  it("should not allow a non-admin to add an electoral official", async function () {
    await expect(election.connect(candidate).addElectoralOfficial(admin.address)).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow an admin to add an already registered electoral official", async function () {
    await expect(election.addElectoralOfficial(admin.address)).to.be.revertedWith("Electoral official already registered");
  });

  it("should not allow a non-admin to verify voter registration", async function () {
    await expect(election.connect(candidate).verifyVoterRegistration(voter.address)).to.be.revertedWith("Only admin can call this function");
  });

  it("should verify digital identity of a registered voter", async function () {
    await election.connect(admin).verifyDigitalIdentity(voter.address, true);

    const voterStatus = await election.verifyVoterRegistration(voter.address);
    expect(voterStatus).to.equal(2); // VoterStatus.Voted
  });

  it("should not allow verifying digital identity of a non-registered voter", async function () {
    await expect(election.connect(admin).verifyDigitalIdentity(candidate.address, true)).to.be.revertedWith("Voter is not registered");
  });

  it("should not allow a non-admin to get election results", async function () {
    await expect(election.connect(candidate).getElectionResults()).to.be.revertedWith("Only admin can call this function");
  });

  it("should not allow getting election results before election is closed", async function () {
    await expect(election.getElectionResults()).to.be.revertedWith("Election is still ongoing");
  });

  it("should get the winner even if there is a tie", async function () {
    // Register candidates
    await election.registerCandidate(candidate.address, "Candidate 1", 25, "Manifesto 1");
    await election.registerCandidate(admin.address, "Candidate 2", 30, "Manifesto 2");

    // Vote for candidates
    await election.connect(voter).vote(candidate.address);
    await election.connect(voter).vote(admin.address);

    // Close the election
    await election.closeElection();

    // Register another voter
    const newVoter = await ethers.getSigner();
    await election.registerVoter(newVoter.address);

    // Vote for the same candidates
    await election.connect(newVoter).vote(candidate.address);
    await election.connect(newVoter).vote(admin.address);

    // Get the winner
    const [winner, voteCount] = await election.getWinner();
    expect(winner).to.equal(candidate.address); // Candidate with the lower address wins in case of a tie
    expect(voteCount).to.equal(2); // Votes for Candidate 1
  });

  // Add more test cases as needed
});
