import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = "All Is Well";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Verify admin authentication
    const { adminToken } = parse(req.headers.cookie || "");
    if (!adminToken) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    jwt.verify(adminToken, JWT_SECRET);

    await connectToDatabase();
    
    const voters = await Voter.find({}, {
      name: 1,
      email: 1,
      rollNumber: 1,
      phoneNumber: 1,
      mustChangePassword: 1,
      createdAt: 1,
      Ethaccount: 1
    }).sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      voters: voters.map(voter => ({
        _id: voter._id,
        name: voter.name,
        email: voter.email,
        rollNumber: voter.rollNumber,
        phoneNumber: voter.phoneNumber,
        mustChangePassword: voter.mustChangePassword,
        ethAccount: voter.Ethaccount,
        createdAt: voter.createdAt
      }))
    });

  } catch (error) {
    console.error("Error fetching voters:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
}
