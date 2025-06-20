// pages/api/verify-voter.ts
import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "@/lib/mongodb";
import Voter from "@/models/Voter";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST requests are allowed" });
  }

  const { rollNumber } = req.body;
  if (!rollNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Missing rollNumber in request" });
  }

  try {
    await connectToDatabase();

    // no generic on .lean(); we’ll treat the result as `any`
    const voter = await Voter.findOne({ rollNumber }).lean().exec();

    if (!voter) {
      return res
        .status(404)
        .json({ success: false, message: "Voter not found" });
    }

    return res.status(200).json({
      success: true,
      voter: {
        rollNumber   : voter.rollNumber,
        name         : voter.name,
        phoneNumber  : String(voter.phoneNumber),
        accountNumber: voter.Ethaccount, // field name in Mongo
        did          : voter.ipfsHash,   // the DID we stored on IPFS
      },
    });
  } catch (err) {
    console.error("verify-voter error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during verification" });
  }
}
