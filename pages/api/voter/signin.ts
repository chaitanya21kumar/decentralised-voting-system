import connectToDatabase from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const JWT_SECRET = "All Is Well";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const { email, password } = req.body;
    const voter = await Voter.findOne({ email });

    if (!voter) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    
    // Check if password matches
    const isPasswordValid = await bcrypt.compare(password, voter.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT token for voter
    const token = jwt.sign({ 
      id: voter._id, 
      email: voter.email, 
      accountNumber: voter.Ethaccount,
      role: 'voter'
    }, JWT_SECRET, {
      expiresIn: "10m", // Token valid for 10 minutes
      algorithm: "HS256",
    });

    // Set cookie with JWT
    res.setHeader(
      "Set-Cookie",
      serialize("voterToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      })
    );

    return res.status(200).json({ 
      success: true,
      mustChangePassword: voter.mustChangePassword, 
      voterId: voter._id,
      message: "Signin successful" 
    });
  } catch (error) {
    console.error("signin error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
