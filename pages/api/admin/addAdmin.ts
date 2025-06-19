import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "../../../lib/mongodb";
import Admin from "../../../models/Admin";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Method not allowed" });

  const { email, password, name } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });

  try {
    await connectToDatabase();

    if (await Admin.findOne({ email }))
      return res.status(409).json({ success: false, message: "Admin already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await Admin.create({ email, password: hashed, name });

    return res.status(201).json({ success: true, message: "Admin created" });
  } catch (err) {
    console.error("addAdmin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
