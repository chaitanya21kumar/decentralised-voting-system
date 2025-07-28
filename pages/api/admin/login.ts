import connectToDatabase from "@/lib/mongodb";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

// Update in Production
const JWT_SECRET =  "All Is Well"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Admin login attempt:', { method: req.method, body: req.body });
  
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
   //  Check content-type before parsing body
  if (req.headers["content-type"] !== "application/json") {
    console.log('Invalid content type:', req.headers["content-type"]);
    return res.status(400).json({ success: false, message: "Expected application/json" });
  }


  const { email, password } = req.body;
  console.log('Login attempt for email:', email);

  try {
    await connectToDatabase();
    const admin = await Admin.findOne({ email });
    console.log('Admin found:', !!admin);
    
    if (!admin) {
      console.log('Admin not found for email:', email);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const passwordMatch = await bcrypt.compare(password, admin.password);
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('Password mismatch for email:', email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ adminId: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "10m" });

    res.setHeader(
      "Set-Cookie",
      serialize("adminToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 10,
        path: "/",
      })
    );

    console.log('Admin login successful for:', email);
    res.status(200).json({ message: "Admin login successful" });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: "Server error" });
  }
}
