module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,         // Adjust this based on your Ganache port
      network_id: "*",    // Match any network ID
    },
  },
  compilers: {
    solc: {
      version: "0.8.20",   
    }
  }
};
