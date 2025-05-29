import connectToDatabase from "@/lib/mongodb";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

const JWT_SECRET =  "All Is Well"; // Use a strong secret in production

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
   //  Check content-type before parsing body
  if (req.headers["content-type"] !== "application/json") {
    return res.status(400).json({ success: false, message: "Expected application/json" });
  }


  const { email, password } = req.body;

  try {
    await connectToDatabase();
    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password)))
      return res.status(401).json({ message: "Invalid credentials" });

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

    res.status(200).json({ message: "Admin login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
