import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import dbConnect from "../../../lib/mongodb";
import IpfsHash from "../../../models/IpfsHash";
import fs from "fs";
import path from "path";
import { votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST method allowed" });
  }

  try {
    const { ipfsHash } = req.body;

    if (!ipfsHash) {
      return res.status(400).json({ success: false, message: "Missing IPFS hash" });
    }

    await dbConnect();

    await IpfsHash.create({
      hash: ipfsHash,
      type: "candidates",
    });

    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    console.log("🔗 Connecting to:", rpcUrl);
    const web3 = new Web3(rpcUrl);
    
    // Test connection first
    try {
      const blockNumber = await web3.eth.getBlockNumber();
      console.log("✅ Connected to blockchain, latest block:", blockNumber);
    } catch (connectionError) {
      console.error("❌ Cannot connect to Hardhat node:", connectionError);
      return res.status(500).json({
        success: false,
        message: "Cannot connect to blockchain. Please ensure Hardhat node is running on localhost:8545",
        error: "Connection failed"
      });
    }
    
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];
    console.log("Admin account:", admin);

    // Load Hardhat-generated ABI
    const artifactPath = path.resolve(process.cwd(), "artifacts/contracts/Voting.sol/Voting.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Replace with deployed contract address
    const contractAddress =votingAddress ;
    const voting = new web3.eth.Contract(artifact.abi, contractAddress);

    // Get candidates from IPFS
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: candidates } = await axios.get(ipfsUrl);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or empty candidates data" });
    }

    /* 5 — add each candidate */
    for (const c of candidates) {
      console.log("Candidate from IPFS:", c);
      const tx = await voting.methods
        .addCandidate(candidate.name, candidate.agenda)
        .send({ from: admin, gas: 1000000 });

      console.log(`Candidate added: ${candidate.name}, Tx Hash: ${tx.transactionHash}`);
    }

    return res.status(200).json({ success: true, message: "Candidates processed successfully" });

  } catch (error) {
    console.error("Error processing candidates:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, message: "Internal server error", error: errorMessage });
  }
}
