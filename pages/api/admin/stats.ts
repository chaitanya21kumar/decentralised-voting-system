// pages/api/admin/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import { votingAbi, votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

const web3 = new Web3("http://voting-hardhat:8545");

/* ─────────────────────────── Types ─────────────────────────── */
type CandidateStat = { name: string; votes: number };

type StatPayload = {
  totalVoters: number;
  votesCast: number;
  candidateStats: CandidateStat[];
  isVotingOpen: boolean;
};

/* ────────────────────────── Handler ────────────────────────── */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Only GET allowed" });
  }

  try {
    await dbConnect();

    /* ───── MongoDB counts ───── */
    const totalVoters = await Voter.countDocuments({});
    const votesCast  = await Voter.countDocuments({ hasVoted: true });

    /* ───── Blockchain tallies ───── */
    const contract = new web3.eth.Contract(votingAbi, votingAddress);

    // helper exists in Voting.sol
    const candidateCount: number = await contract.methods
      .getCandidateCount()
      .call();

    const candidateStats: CandidateStat[] = await Promise.all(
      Array.from({ length: candidateCount }, async (_, idx) => {
        const c = await contract.methods.candidates(idx).call();
        return { name: c.name as string, votes: Number(c.votes) };
      })
    );

    // votingEnd == 0 → not started or already finished
    const votingEnd: number = Number(await contract.methods.votingEnd().call());
    const nowSecs           = Math.floor(Date.now() / 1000);
    const isVotingOpen      = votingEnd !== 0 && nowSecs < votingEnd;

    const payload: StatPayload = {
      totalVoters,
      votesCast,
      candidateStats,
      isVotingOpen,
    };

    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error("stats-api error ➜", error);
    return res
      .status(500)
      .json({ success: false, message: "Stats aggregation failed" });
  }
}
