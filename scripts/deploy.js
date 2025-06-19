const fs = require('fs');
const path = require('path');

async function main() {
    const Web3 = require('web3');
    const web3 = new Web3("http://127.0.0.1:8545");

    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    console.log("Deploying from account:", deployer);

    const contractPath = path.resolve(__dirname, '../artifacts/contracts/Voting.sol/Voting.json');
    const { abi, bytecode } = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

    const Voting = new web3.eth.Contract(abi);

    const didRegistryCID = "QmXhdNqXYJsWb1L8gQZNTDz6sCoUPnR2NZqeiUbw1hHp8q";

    const deployedContract = await Voting.deploy({
        data: bytecode,
        arguments: [didRegistryCID],
    }).send({
        from: deployer,
        gas: 5000000,
    });

    const frontendDir = path.resolve(__dirname, "../frontend/artifacts");
    if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });

    fs.writeFileSync(
        path.join(frontendDir, "deployedAddress.json"),
        JSON.stringify({ address: deployedContract.options.address }, null, 2)
    );

    console.log("Contract deployed at:", deployedContract.options.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
  });
