// pages/api/admin/processVoters.ts

import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import mongoose from "mongoose";
import Voter from "../../../models/Voter";
import connectToDatabase from "../../../lib/mongodb";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

// 1. Random password generator
const generatePassword = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// 2. Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prproject201@gmail.com",
    pass: "hzhy qwmk rqvw jzid", // 🔒 consider using env vars
  },
  socketTimeout: 10000,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST method allowed" });
  }

  const { ipfsHash } = req.body;
  if (!ipfsHash) {
    return res.status(400).json({ success: false, message: "Missing IPFS hash" });
  }

  try {
    await connectToDatabase();

    // Initialize web3
    const web3 = new Web3("http://127.0.0.1:8545");
    const accounts = await web3.eth.getAccounts();
    const admin =accounts[0];

    // Load ABI + address
    const artifactPath = path.resolve(process.cwd(), "artifacts/contracts/Voting.sol/Voting.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Replace with actual deployed address
    const contractAddress =votingAddress;

    const voting = new web3.eth.Contract(artifact.abi, contractAddress);

    // Get voter list from IPFS
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: voters } = await axios.get(ipfsUrl);

    const results = [];

    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);
      const voterAccount = accounts[i + 1]; // start from index 1 to skip admin

      // Register on blockchain
      await voting.methods
  .registerVoter(voter.name, voter.phoneNumber, voter.rollNumber)
  .send({ from:voterAccount , gas: 1000000 }); 


      // Save in DB
      const voterDoc = new Voter({
        rollNumber: voter.rollNumber,
        name: voter.name,
        email: voter.email,
        phoneNumber: voter.phoneNumber,
        Ethaccount: voterAccount,
        mustChangePassword: true,
        passwordHash,
        ipfsHash,
      });
      await voterDoc.save();

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER || "prproject201@gmail.com",
        to: voter.email,
        subject: "Your Voting Credentials",
        html: `<p>Hello ${voter.name},</p><p>Your system-generated password is: <strong>${password}</strong></p><p>Keep this confidential.</p>`,
      });

      results.push({ email: voter.email, status: "success" });
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Process error:", error);
    res.status(500).json({ success: false, message: "Something went wrong", error });
  }
}