// scripts/deploy.js
/**
 * Deploys Voting.sol to the local Hardhat network
 * and writes the address to frontend/artifacts/deployedAddress.json
 */
const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  // ── 1. Get the compiled contract factory
  const Voting = await hre.ethers.getContractFactory("Voting");

  // ── 2. Pass your DID-registry CID to the constructor
  const didRegistryCID = "bafkreicjewvz7tni4x5t4fg22vp7chcslamoco6q2fomchepbvcaygaqk4";

  // ── 3. Deploy
  const voting = await Voting.deploy(didRegistryCID);
  await voting.waitForDeployment();          // ← ethers v6 replacement for `.deployed()`

  const address = await voting.getAddress();
  console.log("Voting deployed to:", address);

  // ── 4. Persist the address for the frontend/API
 const outDir = path.join(__dirname, "..", "app","artifacts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "deployedAddress.json"),
    JSON.stringify({ address }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
