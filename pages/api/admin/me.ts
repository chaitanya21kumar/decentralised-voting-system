import jwt from "jsonwebtoken";
import { parse } from "cookie"; 
import connectToDatabase from "@/lib/mongodb";
import Admin from "@/models/Admin";
const JWT_SECRET = "All Is Well";

import type { NextApiRequest, NextApiResponse } from "next";

interface JwtPayload {
  adminId: string;
  email: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { adminToken } = parse(req.headers.cookie || "");
    
  if (!adminToken) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as JwtPayload;
    await connectToDatabase();
    const admin = await Admin.findOne({ email: decoded.email });

    if (!admin) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      name: admin.name,
      email: admin.email,
      role: 'admin'
    });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
}
