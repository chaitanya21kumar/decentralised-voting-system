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
      10
    );
    const details = await voting.election();
    expect(details.electionTitle).to.equal("Election 2025");
    expect(details.maxVotesPerCandidate).to.equal(10);
  });

  it("should register and verify voters", async () => {
    await voting.connect(voter1).registerVoter("Alice", "123", "did:123");
    const v = await voting.getVoter(voter1.address);
    expect(v.name).to.equal("Alice");

    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).verifyVoter(voter1.address, "did:123");
    const verified = await voting.getVoter(voter1.address);
    expect(verified.isVerified).to.equal(true);
  });

  it("should add candidates", async () => {
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).addCandidate("Bob", "For Progress");
    const c = await voting.candidates(0);
    expect(c.name).to.equal("Bob");
  });

  it("should allow voting and declare a winner", async () => {
    // Setup
    await voting.addAdmin(admin1.address);
    await voting.connect(admin1).setElectionDetails("A", "B", "C", "Title", "Org", 2);
    await voting.connect(admin1).addCandidate("Bob", "Slogan");
    await voting.connect(admin1).addCandidate("Alice", "Slogan");

    await voting.connect(voter1).registerVoter("V1", "123", "did:123");
    await voting.connect(admin1).verifyVoter(voter1.address, "did:123");
    await voting.connect(voter2).registerVoter("V2", "456", "did:456");
    await voting.connect(admin1).verifyVoter(voter2.address, "did:456");

    await voting.connect(admin1).startElection(5); // 5 minutes duration

    await voting.connect(voter1).vote(0); // Vote for Bob
    await voting.connect(voter2).vote(0);
    const c0 = await voting.candidates(0);
    expect(c0.votes).to.equal(2);

    // Simulate election end
    await ethers.provider.send("evm_increaseTime", [5 * 60]);
    await ethers.provider.send("evm_mine");

    // Explicitly end the election
    await voting.connect(admin1).endElection();

    // Assert the WinnerDeclared event
    await expect(voting.connect(admin1).declareWinner())
        .to.emit(voting, "WinnerDeclared")
        .withArgs(0, "Bob", 2);
  });
});
