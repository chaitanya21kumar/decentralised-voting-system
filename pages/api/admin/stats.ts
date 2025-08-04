import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import { votingAbi, votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

/* ───── Resolve RPC URL ─────
 *  1. ENV override       HARDHAT_RPC=http://host:port
 *  2. service-name DNS   "http://hardhat:8545"
 *  3. last-chance local  "http://localhost:8545"
 */
const RPC_URL =
  process.env.HARDHAT_RPC || "http://hardhat:8545";
const web3 = new Web3(RPC_URL);

/* ───────────── Types ───────────── */
type CandidateStat = { name: string; votes: number };
type StatPayload = {
  totalVoters: number;
  votesCast: number;
  candidateStats: CandidateStat[];
  isVotingOpen: boolean;
};

/* ─────────── Helpers ─────────── */
const loadCandidateCount = async (c: any): Promise<number> => {
  if (c.methods.getCandidateCount)     return c.methods.getCandidateCount().call();
  if (c.methods.getCandidatesCount)    return c.methods.getCandidatesCount().call();
  if (c.methods.candidateCount)        return c.methods.candidateCount().call();
  if (c.methods.candidatesCount)       return c.methods.candidatesCount().call();
  throw new Error("No candidate-count method found in contract");
};
const resolveIsVotingOpen = async (c: any): Promise<boolean> => {
  try { if (c.methods.electionEnded) return !(await c.methods.electionEnded().call()); } catch {}
  try {
    const end = Number(await c.methods.votingEnd().call());
    return end !== 0 && Date.now() / 1000 < end;
  } catch {}
  return true; // default
};

/* ────────── Handler ────────── */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, message: "Only GET allowed" });

  try {
    await dbConnect();

    /* Mongo counts */
    const totalVoters = await Voter.countDocuments({});
    const votesCast   = await Voter.countDocuments({ hasVoted: true });

    /* Blockchain tallies */
    const contract        = new web3.eth.Contract(votingAbi, votingAddress);
    const candidateCount  = await loadCandidateCount(contract);
    const candidateStats  = await Promise.all(
      Array.from({ length: candidateCount }, async (_, i) => {
        const c: any = await contract.methods.candidates(i).call();
        const votes  = c.voteCount ?? c.votes ?? 0;
        return { name: c.name, votes: Number(votes) };
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
  } catch (error: any) {
    console.error("stats-api error ➜", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Stats aggregation failed" });
  }
}
