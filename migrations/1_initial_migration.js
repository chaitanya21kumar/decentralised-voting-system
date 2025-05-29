const Voting = artifacts.require("Voting");

module.exports = function (deployer) {
  const didRegistryCID = "QmXhdNqXYJsWb1L8gQZNTDz6sCoUPnR2NZqeiUbw1hHp8q";
  deployer.deploy(Voting, didRegistryCID);
};
