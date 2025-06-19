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

    const web3 = new Web3("http://127.0.0.1:8545");
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

    // Set election and start
    await voting.methods
      .setElectionDetails(
        "Alice Johnson",              // adminName
        "test@gmail.com",             // adminEmail
        "Chief Electoral Officer",    // adminTitle
        "2025 Student Council Polls", // electionTitle
        "ABC Institute of Technology",// organizationTitle
        4                             // maxVotes
      )
      .send({ from: admin , gas: 1000000});

    await voting.methods.startElection(5).send({ from: admin });

    for (const candidate of candidates) {
      console.log("Candidate from IPFS:", candidate);
console.log("Name length:", candidate.name.length);
console.log("Agenda length:", candidate.agenda.length);
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
