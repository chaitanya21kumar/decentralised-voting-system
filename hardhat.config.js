require("@nomiclabs/hardhat-web3");

module.exports = {
  solidity: "0.8.20", // Adjust if needed
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
};

