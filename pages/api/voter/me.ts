import jwt from "jsonwebtoken";
import { parse } from "cookie"; 
import connectToDatabase from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
const JWT_SECRET = "All Is Well";

import type { NextApiRequest, NextApiResponse } from "next";

interface JwtPayload {
  id: string;
  email: string;
  accountNumber: string;
  role: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { voterToken } = parse(req.headers.cookie || "");
    
  if (!voterToken) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(voterToken, JWT_SECRET) as JwtPayload;
    
    // Verify this is a voter token
    if (decoded.role !== 'voter') {
      return res.status(401).json({ authenticated: false });
    }
    
    await connectToDatabase();
    const voter = await Voter.findOne({ email: decoded.email });

    if (!voter) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      name: voter.name,
      email: voter.email,
      phoneNumber: voter.phoneNumber,
      accountNumber: voter.Ethaccount,
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ authenticated: false });
  }
}
