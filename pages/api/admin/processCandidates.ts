import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import dbConnect from "../../../lib/mongodb"; // your MongoDB connection utility
import IpfsHash from "../../../models/IpfsHash"; // model for storing IPFS hashes
import fs from "fs";
import path from "path";
const Web3 = require("web3");
const contract = require("@truffle/contract");


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST method allowed" });
  }

  try {
    const { ipfsHash } = req.body;
    await dbConnect();
    await IpfsHash.create({
      hash: ipfsHash,
      type: "candidates",
    });

    if (!ipfsHash) {
      return res.status(400).json({ success: false, message: "Missing IPFS hash" });
    }

    const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
    const web3 = new Web3(provider);

    const artifactPath = path.join(process.cwd(), "build/contracts/Voting.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const Voting = contract(artifact);
    Voting.setProvider(provider);

    // Compatibility patch
    if (typeof Voting.currentProvider.sendAsync !== "function") {
      Voting.currentProvider.sendAsync = function () {
        return Voting.currentProvider.send.apply(Voting.currentProvider, arguments);
      };
    }

    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];
    const voting = await Voting.deployed();

    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: candidates } = await axios.get(ipfsUrl);
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or empty candidates data" });
    }
    await voting.setElectionDetails(
      "Alice Johnson",              // adminName
      "test@gmail.com",          // adminEmail
      "Chief Electoral Officer",    // adminTitle
      "2025 Student Council Polls", // electionTitle
      "ABC Institute of Technology",// organizationTitle
      4,                            // maxVotes
      { from: admin }
    );
    await voting.startElection(20, { from: admin });

    for (const candidate of candidates) {
      const tx = await voting.addCandidate(candidate.name, candidate.agenda, { from: admin });
      console.log(`Candidate added: ${candidate.name}, Transaction Hash: ${tx.tx}`);

    }

    return res.status(200).json({ success: true, message: "Candidates processed successfully" });

  } catch (error) {
    console.error("Error processing candidates:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, message: "Internal server error", error: errorMessage });
  }
}
