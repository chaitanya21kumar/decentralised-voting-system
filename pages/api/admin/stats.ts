// pages/api/admin/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import { votingAbi, votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

const web3 = new Web3("http://voting-hardhat:8545");

/* ──────────────── Types ──────────────── */
type CandidateStat = { name: string; votes: number };

type StatPayload = {
  totalVoters: number;
  votesCast: number;
  candidateStats: CandidateStat[];
  isVotingOpen: boolean;
};

/* ──────────────── Helpers ──────────────── */
const loadCandidateCount = async (contract: any): Promise<number> => {
  // try a few common patterns and fail loudly if none exist
  if (contract.methods.getCandidateCount)
    return await contract.methods.getCandidateCount().call();
  if (contract.methods.getCandidatesCount)
    return await contract.methods.getCandidatesCount().call();
  if (contract.methods.candidateCount)
    return await contract.methods.candidateCount().call();
  if (contract.methods.candidatesCount)
    return await contract.methods.candidatesCount().call();

  throw new Error("No candidate-count method found in contract");
};

const resolveIsVotingOpen = async (contract: any): Promise<boolean> => {
  try {
    // common boolean flag
    if (contract.methods.electionEnded)
      return !(await contract.methods.electionEnded().call());
  } catch {
    /* ignore */
  }

  try {
    // timestamp variant
    const votingEnd: number = Number(await contract.methods.votingEnd().call());
    const nowSecs = Math.floor(Date.now() / 1000);
    return votingEnd !== 0 && nowSecs < votingEnd;
  } catch {
    /* ignore */
  }

  // default to “open” if helpers missing
  return true;
};

/* ──────────────── Handler ──────────────── */
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
    const votesCast = await Voter.countDocuments({ hasVoted: true });

    /* ───── Blockchain tallies ───── */
    const contract = new web3.eth.Contract(votingAbi, votingAddress);

    const candidateCount = await loadCandidateCount(contract);

    const candidateStats: CandidateStat[] = await Promise.all(
      Array.from({ length: candidateCount }, async (_, idx) => {
        const c: any = await contract.methods.candidates(idx).call();

        // tolerate both `.voteCount` and `.votes`
        const votes =
          c.voteCount !== undefined
            ? Number(c.voteCount)
            : c.votes !== undefined
            ? Number(c.votes)
            : 0;

        return { name: c.name as string, votes };
      })
    );

    const isVotingOpen = await resolveIsVotingOpen(contract);

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
