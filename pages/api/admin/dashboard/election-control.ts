import type { NextApiRequest, NextApiResponse } from "next";
import Web3 from "web3";
import { votingAbi, votingAddress } from "../../../../app/artifacts/votingArtifact";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { action, ...params } = req.body;

  try {
    const web3 = new Web3("http://127.0.0.1:8545");
    const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    const adminAccount = accounts[0]; 

    switch (action) {
      case "setElectionDetails":
        {
          const {
            adminName,
            adminEmail,
            adminTitle,
            electionTitle,
            organizationTitle,
            maxVotes
          } = params;

          if (!electionTitle || !maxVotes) {
            return res.status(400).json({
              success: false,
              message: "Election title and max votes are required"
            });
          }

          const tx = await voting.methods
            .setElectionDetails(
              adminName || "",
              adminEmail || "",
              adminTitle || "",
              electionTitle,
              organizationTitle || "",
              maxVotes
            )
            .send({ from: adminAccount, gas: 300000 });

          return res.status(200).json({
            success: true,
            message: "Election details set successfully",
            transactionHash: tx.transactionHash
          });
        }

      case "startElection":
        {
          const { durationMinutes } = params;
          
          if (!durationMinutes || durationMinutes <= 0) {
            return res.status(400).json({
              success: false,
              message: "Valid duration in minutes is required"
            });
          }

          const tx = await voting.methods
            .startElection(durationMinutes)
            .send({ from: adminAccount, gas: 200000 });

          return res.status(200).json({
            success: true,
            message: "Election started successfully",
            transactionHash: tx.transactionHash
          });
        }

      case "endElection":
        {
          const tx = await voting.methods
            .endElection()
            .send({ from: adminAccount, gas: 200000 });

          return res.status(200).json({
            success: true,
            message: "Election ended successfully",
            transactionHash: tx.transactionHash
          });
        }

      case "declareWinner":
        {
          const result = await voting.methods
            .declareWinner()
            .call({ from: adminAccount });

          const tx = await voting.methods
            .declareWinner()
            .send({ from: adminAccount, gas: 300000 });

          return res.status(200).json({
            success: true,
            message: "Winner declared successfully",
            winner: {
              winnerId: result.winnerId,
              winnerName: result.winnerName,
              maxVotes: result.maxVotes
            },
            transactionHash: tx.transactionHash
          });
        }

      case "pauseContract":
        {
          const { pause } = params;
          
          const tx = await voting.methods
            .pauseContract(pause)
            .send({ from: adminAccount, gas: 200000 });

          return res.status(200).json({
            success: true,
            message: pause ? "Contract paused" : "Contract unpaused",
            transactionHash: tx.transactionHash
          });
        }

      case "addCandidate":
        {
          const { name, slogan } = params;
          
          if (!name) {
            return res.status(400).json({
              success: false,
              message: "Candidate name is required"
            });
          }

          const tx = await voting.methods
            .addCandidate(name, slogan || "")
            .send({ from: adminAccount, gas: 300000 });

          return res.status(200).json({
            success: true,
            message: "Candidate added successfully",
            transactionHash: tx.transactionHash
          });
        }

      case "getElectionStatus":
        {
          const [
            votingStart,
            votingEnd,
            detailsSet,
            isPaused,
            candidateCount,
            voterCount
          ] = await Promise.all([
            voting.methods.votingStart().call(),
            voting.methods.votingEnd().call(),
            voting.methods.detailsSet().call(),
            voting.methods.isPaused().call(),
            voting.methods.getCandidateCount().call(),
            voting.methods.voterCount().call(),
          ]);

          const currentTime = Date.now() / 1000;
          const startTime = Number(votingStart);
          const endTime = Number(votingEnd);
          
          let status = "not_started";
          if (startTime > 0) {
            if (currentTime >= startTime && currentTime <= endTime) {
              status = "running";
            } else if (currentTime > endTime) {
              status = "ended";
            }
          }

          return res.status(200).json({
            success: true,
            status: {
              votingStart: startTime,
              votingEnd: endTime,
              detailsSet,
              isPaused,
              candidateCount: Number(candidateCount),
              voterCount: Number(voterCount),
              electionStatus: status,
              timeLeft: Math.max(0, endTime - currentTime)
            }
          });
        }

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }

  } catch (error: any) {
    console.error("Election control error:", error);
    return res.status(500).json({
      success: false,
      message: "Contract operation failed",
      error: error.message
    });
  }
}