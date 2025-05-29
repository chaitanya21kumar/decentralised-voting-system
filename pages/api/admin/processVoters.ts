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
const Web3 = require("web3");
const contract = require("@truffle/contract");




// 3. Random password generator
const generatePassword = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// 4. Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prproject201@gmail.com",
    pass: "hzhy qwmk rqvw jzid",
  },
  socketTimeout: 10000, // 10 seconds
});

// 5. API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST method allowed" });
  }

  const { ipfsHash } = req.body;
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

  try {
     await connectToDatabase();

    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: voters } = await axios.get(ipfsUrl);

    const results = [];
    let i=1;
    for (const voter of voters) {
      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);
      const Ethaccount = accounts[i];

      await voting.registerVoter(voter.name, voter.phoneNumber, voter.rollNumber, { from: Ethaccount });
      i++;
      // Save to DB
      const voterDoc = new Voter({
        rollNumber: voter.rollNumber,
        name: voter.name,
        email: voter.email,
        phoneNumber: voter.phoneNumber,
        Ethaccount : Ethaccount,
        mustChangePassword: true,
        passwordHash,
        ipfsHash,
      });
      await voterDoc.save();

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: voter.email,
        subject: "Your Voting Credentials",
        html: `<p>Hello ${voter.name},</p><P>Your system-generated password is: <strong>${password}</strong></p><p>Keep this confidential.</p>`,
      });

      results.push({ email: voter.email, status: "success" });
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Process error:", error);
    res.status(500).json({ success: false, message: "Something went wrong", error });
  }
}
