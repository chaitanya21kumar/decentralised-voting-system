// pages/api/admin/processVoters.ts

import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// 1. MongoDB setup
const MONGODB_URI = "mongodb://localhost:27017/decentralised-voting-system";

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
};

// 2. Mongoose Voter model
const VoterSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true },
  name: String,
  email: String,
  passwordHash: String,
  ipfsHash: String,
});

const Voter = mongoose.models.Voter || mongoose.model("Voter", VoterSchema);

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

  try {
    await connectToDatabase();

    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: voters } = await axios.get(ipfsUrl);

    const results = [];

    for (const voter of voters) {
      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);

      // Save to DB
      const voterDoc = new Voter({
        rollNumber: voter.rollNumber,
        name: voter.name,
        email: voter.email,
        passwordHash,
        ipfsHash,
      });
      await voterDoc.save();

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: voter.email,
        subject: "Your Voting Credentials",
        html: `<p>Hello ${voter.name},</p><P>Your Username is your Roll number and <p>Your system-generated password is: <strong>${password}</strong></p><p>Keep this confidential.</p>`,
      });

      results.push({ email: voter.email, status: "success" });
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Process error:", error);
    res.status(500).json({ success: false, message: "Something went wrong", error });
  }
}
