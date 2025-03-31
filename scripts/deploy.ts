const hre = require("hardhat");

async function main() {
  const ContractFactory = await hre.ethers.getContractFactory("Voting"); 
  const contract = await ContractFactory.deploy("bafkreianfnfjtsssbm7vekii7hdvzutnjij5j2qxzqpao3ibs6lymcfuyy"); // Pass a valid IPFS CID

  await contract.waitForDeployment(); // Fix for `deployed()`

  console.log(`Contract deployed to: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
