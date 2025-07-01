import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import connectToDatabase from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

const generatePassword = (len = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "prproject201@gmail.com",
    pass: process.env.EMAIL_PASS || "hzhy qwmk rqvw jzid",
  },
  socketTimeout: 10000,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { ipfsHash } = req.body;
  if (!ipfsHash) {
    return res.status(400).json({ success: false, message: "Missing IPFS hash" });
  }

  try {
    // Step 1: DB + Web3
    await connectToDatabase();

    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const web3 = new Web3(rpcUrl);

    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length < 2) {
      throw new Error("Not enough Ethereum accounts available.");
    }

    const artifactPath = path.resolve(
      process.cwd(),
      "artifacts/contracts/Voting.sol/Voting.json"
    );
    const artifactRaw = fs.readFileSync(artifactPath, "utf8");
    const artifact = JSON.parse(artifactRaw);
    const voting = new web3.eth.Contract(artifact.abi, votingAddress);

    // Step 2: Fetch from IPFS
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    let voters;
    try {
      const response = await axios.get(ipfsUrl);
      voters = response.data;
      if (!Array.isArray(voters)) {
        throw new Error("IPFS data is not a valid array.");
      }
    } catch (err) {
      console.error("❌ IPFS Fetch Failed:", err);
      return res.status(400).json({
        success: false,
        message: "Failed to fetch or parse voter data from IPFS.",
      });
    }

    const results: { email: string; status: string; reason?: string }[] = [];

    // Step 3: Register & store each voter
    for (let i = 0; i < voters.length; i++) {
      const v = voters[i];

      // Validate required fields
      if (!v.name || !v.email || !v.phoneNumber || !v.rollNumber) {
        results.push({ email: v.email || "unknown", status: "failed", reason: "Missing fields" });
        continue;
      }

      // Check if we have enough Ethereum accounts
      const voterAccount = accounts[i + 1];
      if (!voterAccount) {
        results.push({ email: v.email, status: "failed", reason: "Not enough Ethereum accounts" });
        continue;
      }

      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);

      try {
        // Register in smart contract
        await voting.methods
          .registerVoter(v.name, v.phoneNumber, v.rollNumber)
          .send({ from: voterAccount, gas: 1_000_000 });
      } catch (err) {
        console.error(`❌ Smart contract error for ${v.name}:`, err);
        results.push({ email: v.email, status: "failed", reason: "Smart contract error" });
        continue;
      }

      try {
        // Save in DB
        const voterDoc = new Voter({
          rollNumber: v.rollNumber,
          name: v.name,
          email: v.email,
          phoneNumber: v.phoneNumber,
          Ethaccount: voterAccount,
          mustChangePassword: true,
          passwordHash,
          ipfsHash,
        });
        await voterDoc.save();
      } catch (err) {
        console.error(`❌ MongoDB save failed for ${v.email}:`, err);
        results.push({ email: v.email, status: "failed", reason: "Database error" });
        continue;
      }

      try {
        // Send email
        await transporter.sendMail({
          from: process.env.EMAIL_USER || "prproject201@gmail.com",
          to: v.email,
          subject: "Your Voting Credentials",
          html: `<p>Hello ${v.name},</p>
                <p>Your voting password is: <strong>${password}</strong></p>`,
        });
      } catch (err) {
        console.error(`❌ Email failed for ${v.email}:`, err);
        results.push({ email: v.email, status: "failed", reason: "Email error" });
        continue;
      }

      results.push({ email: v.email, status: "success" });
    }

    return res.status(200).json({ success: true, results });

  } catch (error: any) {
    console.error("❌ Top-level error in processVoters:", error?.stack || error);
    return res.status(500).json({
      success: false,
      message: "Server error during voter processing",
      error: error?.message || "Unknown error",
    });
  }
}
