import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase    from "@/lib/mongodb";
import Voter                from "@/models/Voter";
import jwt                  from "jsonwebtoken";
import { parse }            from "cookie";

const JWT_SECRET = "All Is Well";            // same as other voter routes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "POST only" });

  // ── 1. Auth via voterToken cookie
  const { voterToken } = parse(req.headers.cookie || "");
  if (!voterToken) return res.status(401).json({ success: false, message: "No token" });

  let voterId: string;
  try {
    const decoded: any = jwt.verify(voterToken, JWT_SECRET);
    voterId = decoded.id;
  } catch {
    return res.status(401).json({ success: false, message: "Bad token" });
  }

  // ── 2. Validate embedding payload
  const { embedding } = req.body;            // expected: number[128]
  if (!Array.isArray(embedding) || embedding.length !== 128)
    return res.status(400).json({ success: false, message: "Invalid embedding" });

  // ── 3. Persist
  try {
    await connectToDatabase();
    await Voter.findByIdAndUpdate(voterId, {
      faceEmbedding: embedding,
      faceSet: true,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("set-face error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
