import jwt from "jsonwebtoken";
import { parse } from "cookie"; 
import connectToDatabase from "@/lib/mongodb";
import Voter from "@/models/Voter";
const JWT_SECRET = "All Is Well";

import type { NextApiRequest, NextApiResponse } from "next";
interface JwtPayload {
  adminId?: string;
  id?: string;
  name?: string;
  email: string;
  phoneNumber?: number;
  accountNumber?: string;
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
    await connectToDatabase();
    
    const voter = await Voter.findOne({ email: decoded.email });
    if (!voter) return res.status(401).json({ authenticated: false });
    
    return res.status(200).json({
      authenticated: true,
      name: voter.name,
      phoneNumber: voter.phoneNumber,
      accountNumber: voter.Ethaccount, 
      user: decoded
    });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
}
