// pages/api/admin/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Voter from "../../../models/Voter";
import { votingAddress } from "../../../app/artifacts/votingArtifact";
import votingArtifact from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

// use the hard-hat chain that is already running in the docker network
const web3 = new Web3("http://voting-hardhat:8545");

type StatPayload = {
  totalVoters: number;
  votesCast: number;
  candidateStats: { name: string; votes: number }[];
  isVotingOpen: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, message: "Only GET allowed" });

  try {
    await dbConnect();

    // ---------------- database counts ----------------
    const totalVoters = await Voter.countDocuments({});
    const votesCast   = await Voter.countDocuments({ hasVoted: true });

    // ---------------- blockchain tallies -------------
    const contract = new web3.eth.Contract(
      votingArtifact.abi,
      votingAddress as string
    );

    // assumes Voting.sol exposes these helpers👇 – they exist in your contract
    const candidateCount: number = await contract.methods
      .getCandidatesCount()
      .call();

    const candidateStats = await Promise.all(
      [...Array(candidateCount).keys()].map(async (idx) => {
        const c = await contract.methods.candidates(idx).call();
        return { name: c.name as string, votes: Number(c.voteCount) };
      })
    );

    const isVotingOpen: boolean = !(await contract.methods.electionEnded().call());

    const payload: StatPayload = {
      totalVoters,
      votesCast,
      candidateStats,
      isVotingOpen,
    };

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error("stats-api error ➜", err);
    return res
      .status(500)
      .json({ success: false, message: "Stats aggregation failed" });
  }
}
