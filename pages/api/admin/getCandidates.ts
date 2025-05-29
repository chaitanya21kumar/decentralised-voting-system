import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import dbConnect from "../../../lib/mongodb";
import IpfsHash from "../../../models/IpfsHash";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();

    const latest = await IpfsHash.findOne({ type: "candidates" }).sort({ uploadedAt: -1 });
 if (!latest) {
      return res.status(404).json({ success: false, message: "No candidate hash found" });
    }
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${latest.hash}`;
    const { data: candidates } = await axios.get(url);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: "No valid candidate data found" });
    }

    res.status(200).json({ success: true, candidates });
  } catch (error) {
    console.error("❌ Failed to fetch candidates from IPFS:", error);
    res.status(500).json({ success: false, message: "Error fetching candidates from IPFS" });
  }
}
