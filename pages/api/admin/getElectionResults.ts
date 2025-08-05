import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { votingAddress } from "../../../app/artifacts/votingArtifact";
const Web3 = require("web3");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Setup Web3 and contract
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const web3 = new Web3(rpcUrl);

    const artifactPath = path.resolve(
      process.cwd(),
      "artifacts/contracts/Voting.sol/Voting.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const voting = new web3.eth.Contract(artifact.abi, votingAddress);

    // Get election stats
    const [candidateCount, totalVotesCast, votingStart, votingEnd] = await Promise.all([
      voting.methods.candidateCount().call(),
      voting.methods.totalVotesCast().call(),
      voting.methods.votingStart().call(),
      voting.methods.votingEnd().call(),
    ]);

    // Get candidate details and votes
    const candidates = [];
    for (let i = 0; i < Number(candidateCount); i++) {
      const candidate = await voting.methods.candidates(i).call();
      candidates.push({
        id: Number(candidate.id),
        name: candidate.name,
        slogan: candidate.slogan,
        votes: Number(candidate.votes)
      });
    }

    // Calculate percentages
    const total = Number(totalVotesCast);
    const candidatesWithPercentage = candidates.map(candidate => ({
      ...candidate,
      percentage: total > 0 ? ((candidate.votes / total) * 100).toFixed(1) : "0.0"
    }));

    // Sort by votes (descending)
    candidatesWithPercentage.sort((a, b) => b.votes - a.votes);

    const winner = candidatesWithPercentage.length > 0 ? candidatesWithPercentage[0] : null;

    return res.status(200).json({
      success: true,
      data: {
        totalVotes: total,
        candidateCount: Number(candidateCount),
        candidates: candidatesWithPercentage,
        winner,
        votingPeriod: {
          start: Number(votingStart),
          end: Number(votingEnd),
          isActive: Date.now() / 1000 >= Number(votingStart) && Date.now() / 1000 <= Number(votingEnd)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching election results:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching election results",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
