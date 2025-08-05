const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
  let Voting, voting;
  let superAdmin, admin1, voter1, voter2;

  beforeEach(async () => {
    [superAdmin, admin1, voter1, voter2] = await ethers.getSigners();
    Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy("QmDummyCID");
  });

  it("should deploy and set superAdmin", async () => {
    expect(await voting.superAdmin()).to.equal(superAdmin.address);
  });

  it("should allow superAdmin to add and remove admin", async () => {
    await voting.addAdmin(admin1.address);
    expect(await voting.admins(admin1.address)).to.equal(true);

    await voting.removeAdmin(admin1.address);
    expect(await voting.admins(admin1.address)).to.equal(false);
  });

  it("should allow admin to set election details", async () => {
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails(
      "Admin Name",
      "admin@example.com",
      "Title",
      "Election 2025",
      "Org",
      2      // small limit for edge-case tests
    );
    const details = await voting.election();
    expect(details.electionTitle).to.equal("Election 2025");
    expect(details.maxVotesPerCandidate).to.equal(2);
  });

  it("should reject zero-length election", async () => {
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails("A","B","C","T","O",1);
    await expect(
      voting.connect(admin1).startElection(0)
    ).to.be.revertedWith("Must be > 0");
  });

  it("should register and verify voters only before start", async () => {
    // register before start
    await voting.connect(voter1).registerVoter("Alice","123","did:123");
    expect((await voting.getVoter(voter1.address)).name).to.equal("Alice");

    // start election
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails("A","B","C","T","O",1);
    await voting.connect(admin1).startElection(5);

    // now registration is closed
    await expect(
      voting.connect(voter2).registerVoter("Bob","456","did:456")
    ).to.be.revertedWith("Registration closed");
  });

  it("should add candidates and reject duplicate names", async () => {
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).addCandidate("Bob","X");
    const c = await voting.candidates(0);
    expect(c.name).to.equal("Bob");

    // duplicate
    await expect(
      voting.connect(admin1).addCandidate("Bob","Y")
    ).to.be.revertedWith("Duplicate candidate");
  });

  it("should enforce vote limit per candidate and prevent double-voting", async () => {
    // setup
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails("A","B","C","T","O",1);
    await voting.connect(admin1).addCandidate("Bob","X");

    // register & verify two voters
    await voting.connect(voter1).registerVoter("V1","1","did:1");
    await voting.connect(voter2).registerVoter("V2","2","did:2");
    await voting.connect(admin1).verifyVoter(voter1.address,"did:1");
    await voting.connect(admin1).verifyVoter(voter2.address,"did:2");

    // start election
    await voting.connect(admin1).startElection(5);

    // first vote ok
    await voting.connect(voter1).vote(0);
    // second vote limit reached
    await expect(
      voting.connect(voter2).vote(0)
    ).to.be.revertedWith("Vote limit reached");

    // double-voting check with same voter
    await expect(
      voting.connect(voter1).vote(0)
    ).to.be.revertedWith("Already voted");
  });

  it("should allow voting and declare a winner", async () => {
    // Setup with maxVotesPerCandidate = 2
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails("A","B","C","T","O",2);
    await voting.connect(admin1).addCandidate("Bob","X");
    await voting.connect(admin1).addCandidate("Alice","Y");

    // register & verify
    await voting.connect(voter1).registerVoter("V1","1","did:1");
    await voting.connect(voter2).registerVoter("V2","2","did:2");
    await voting.connect(admin1).verifyVoter(voter1.address,"did:1");
    await voting.connect(admin1).verifyVoter(voter2.address,"did:2");

    // start + votes
    await voting.connect(admin1).startElection(5);
    await voting.connect(voter1).vote(0);
    await voting.connect(voter2).vote(0);
    expect((await voting.candidates(0)).votes).to.equal(2);

    // end + declare
    await ethers.provider.send("evm_increaseTime",[5*60]);
    await ethers.provider.send("evm_mine");
    await voting.connect(admin1).endElection();

    await expect(voting.connect(admin1).declareWinner())
      .to.emit(voting, "WinnerDeclared")
      .withArgs(0, "Bob", 2);
  });

  it("should reset election state properly", async () => {
    // run a quick election
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails("A","B","C","T","O",1);
    await voting.connect(admin1).addCandidate("Bob","X");
    await voting.connect(voter1).registerVoter("V1","1","did:1");
    await voting.connect(admin1).verifyVoter(voter1.address,"did:1");
    await voting.connect(admin1).startElection(1);
    await voting.connect(voter1).vote(0);
    await ethers.provider.send("evm_increaseTime",[2*60]);
    await ethers.provider.send("evm_mine");
    await voting.connect(admin1).endElection();

    // reset
    await voting.connect(admin1).resetElection();

    // all candidate slots cleared
    expect(await voting.getCandidateCount()).to.equal(0);
    // voter can register again
    await voting.connect(voter1).registerVoter("V1b","1b","did:1b");
    expect((await voting.getVoter(voter1.address)).name).to.equal("V1b");
  });
});
