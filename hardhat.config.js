// hardhat.config.js

require("@nomicfoundation/hardhat-toolbox"); // Loads ethers, waffle, chai, etc.

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      // ✅ Docker-safe: picks RPC from env, else falls back to 127.0.0.1 for local dev
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
    },
  },
};
