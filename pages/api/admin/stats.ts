// pages/api/admin/stats.ts  (debug version)
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import { votingAbi, votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

const RPC_URL = process.env.HARDHAT_RPC ?? "http://voting-hardhat:8545";
const web3    = new Web3(RPC_URL);

/* … unchanged helper code from previous version … */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, message: "Only GET allowed" });

  try {
    /* ── original logic here (unchanged) ── */
  } catch (error: any) {
    console.error("stats-api error ➜", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Stats aggregation failed",
    });
  }
}
