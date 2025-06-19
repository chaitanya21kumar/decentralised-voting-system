// hardhat.config.js  – final version
require("@nomicfoundation/hardhat-toolbox");   // ← loads hardhat-ethers, chai, etc.

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "localhost",
  networks: {
    localhost: {               // matches the Hardhat node you already started
      url: "http://127.0.0.1:8545",
    },
  },
};
