// pages/api/admin/processCandidates.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import dbConnect from "../../../lib/mongodb";
import IpfsHash from "../../../models/IpfsHash";
import fs from "fs";
import path from "path";
import { votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST method allowed" });
  }

  try {
    const { ipfsHash } = req.body;

    if (!ipfsHash) {
      return res
        .status(400)
        .json({ success: false, message: "Missing IPFS hash" });
    }

    /* 1 — store hash in DB */
    await dbConnect();
    await IpfsHash.create({ hash: ipfsHash, type: "candidates" });

    /* 2 — chain setup */
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const web3 = new Web3(rpcUrl);
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];
    console.log("Admin account:", admin);

    /* 3 — contract handle */
    const artifactPath = path.resolve(
      process.cwd(),
      "artifacts/contracts/Voting.sol/Voting.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const voting = new web3.eth.Contract(artifact.abi, votingAddress);

    /* 4 — fetch candidates JSON from IPFS */
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: candidates } = await axios.get(ipfsUrl);
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or empty candidates data" });
    }

    /* 5 — election details */
    await voting.methods
      .setElectionDetails(
        "Alice Johnson", // adminName
        "test@gmail.com", // adminEmail
        "Chief Electoral Officer", // adminTitle
        "2025 Student Council Polls", // electionTitle
        "ABC Institute of Technology", // organizationTitle
        4 // maxVotes
      )
      .send({ from: admin, gas: 1_000_000 });

    /* 6 — start 10-minute election (NO PARAM) */
    await voting.methods.startElection().send({ from: admin });

    /* 7 — add each candidate */
    for (const c of candidates) {
      console.log("Candidate from IPFS:", c);
      const tx = await voting.methods
        .addCandidate(c.name, c.agenda)
        .send({ from: admin, gas: 1_000_000 });
      console.log(`Candidate added: ${c.name}, Tx Hash: ${tx.transactionHash}`);
    }

    return res
      .status(200)
      .json({ success: true, message: "Candidates processed successfully" });
  } catch (error) {
    console.error("Error processing candidates:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error: msg });
  }
}
