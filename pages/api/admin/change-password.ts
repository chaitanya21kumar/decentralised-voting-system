import connectToDatabase from "../../../lib/mongodb";
import voter from "../../../models/Voter";
import bcrypt from "bcryptjs";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();
  const { voterId, newPassword } = req.body;

  const hashed = await bcrypt.hash(newPassword, 10);

  await voter.findByIdAndUpdate(voterId, {
    passwordHash: hashed,
    mustChangePassword: false,
  });

  return res.status(200).json({ success: true });
}
