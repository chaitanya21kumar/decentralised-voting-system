// pages/api/admin/processVoters.ts

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
    user: "prproject201@gmail.com",
    pass: "hzhy qwmk rqvw jzid",
  },
  socketTimeout: 10000,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { ipfsHash } = req.body;
  if (!ipfsHash) {
    return res.status(400).json({ success: false, message: "Missing IPFS hash" });
  }

  try {
    await connectToDatabase();

    const web3 = new Web3("http://127.0.0.1:8545");
    const accounts = await web3.eth.getAccounts();
    const admin    = accounts[0];

    const artifactPath = path.resolve(
      process.cwd(),
      "artifacts/contracts/Voting.sol/Voting.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const voting   = new web3.eth.Contract(artifact.abi, votingAddress);

    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: voters } = await axios.get(ipfsUrl);

    const results: { email: string; status: string }[] = [];

    for (let i = 0; i < voters.length; i++) {
      const v = voters[i];
      const password     = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);
      const voterAccount = accounts[i + 1];

      // ── 🔑 THIS IS THE ONLY CHANGE: pass ipfsHash, not rollNumber
      await voting.methods
        .registerVoter(v.name, v.phoneNumber, ipfsHash)
        .send({ from: voterAccount, gas: 1_000_000 });

      // …save to Mongo and send email as before…
      const voterDoc = new Voter({
        rollNumber:         v.rollNumber,
        name:               v.name,
        email:              v.email,
        phoneNumber:        v.phoneNumber,
        Ethaccount:         voterAccount,
        mustChangePassword: true,
        passwordHash,
        ipfsHash,
      });
      await voterDoc.save();

      await transporter.sendMail({
        from: process.env.EMAIL_USER || "prproject201@gmail.com",
        to: v.email,
        subject: "Your Voting Credentials",
        html: `<p>Hello ${v.name},</p>
               <p>Your password is: <strong>${password}</strong></p>`,
      });

      results.push({ email: v.email, status: "success" });
    }

    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    console.error("Process error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong", error: error.message });
  }
}
