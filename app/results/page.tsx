"use client";
import React, { useEffect, useRef, useState } from "react";
import Web3 from "web3";
import SignHeader from "@/components/ui/signHeader";
import artifact from "../../build/contracts/Voting.json";
import { showToast } from "../../pages/api/admin/showToast";
import { motion } from "framer-motion";
const contract = require("@truffle/contract");

interface Candidate {
  candidateId: number;
  name: string;
  slogan: string;
  votes: number;
}

function formatSecondsToHHMMSS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
}

export default function ResultsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [winner, setWinner] = useState<{
    name: string;
    votes: number;
    candidateId: number;
  } | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [timeLeftPercent, setTimeLeftPercent] = useState(100);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const hasRun = useRef(false);
  const votingEndRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const loadingMessages = [
    "Counting votes securely...",
    "Waiting for voting period to end...",
    "Analyzing voter data...",
    "Tallying the results...",
   
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const fetchResults = async () => {
      const toastId = window.crypto.randomUUID();
      // showToast("Waiting for election results...", "success", toastId);

      try {
        const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
        const web3 = new Web3(provider);
        const Voting = contract(artifact);
        Voting.setProvider(provider);

        if (typeof Voting.currentProvider.sendAsync !== "function") {
          Voting.currentProvider.sendAsync = function () {
            return Voting.currentProvider.send.apply(Voting.currentProvider, arguments);
          };
        }

        const accounts = await web3.eth.getAccounts();
        const admin = accounts[0];
        const voting = await Voting.deployed();

        const votingEnd = (await voting.votingEnd()).toNumber();
        votingEndRef.current = votingEnd;

        const latestBlock = await web3.eth.getBlock("latest");
        const now = Number(latestBlock.timestamp);
        startTimeRef.current = now;

        const updateProgressBar = async () => {
          const currentBlock = await web3.eth.getBlock("latest");
          const currentTime = Number(currentBlock.timestamp);
          const totalDuration = votingEndRef.current! - startTimeRef.current!;
          const elapsed = currentTime - startTimeRef.current!;
          const timeLeft = votingEndRef.current! - currentTime;

          if (elapsed >= totalDuration) {
            setTimeLeftPercent(0);
            setTimeLeftSeconds(0);
            return false;
          }

          const percent = Math.max(0, 100 - (elapsed / totalDuration) * 100);
          setTimeLeftPercent(percent);
          setTimeLeftSeconds(timeLeft);
          return true;
        };

        const interval = setInterval(async () => {
          const shouldContinue = await updateProgressBar();
          if (!shouldContinue) {
            clearInterval(interval);
          }
        }, 1000);

        const waitUntilVotingEnds = async () => {
          while (true) {
            const latestBlock = await web3.eth.getBlock("latest");
            const now = latestBlock.timestamp;
            if (Number(now) >= votingEndRef.current!) break;

            await web3.eth.sendTransaction({ from: admin, to: admin, value: 0 });
            await new Promise((res) => setTimeout(res, 3000));
          }
        };

        await waitUntilVotingEnds();
        clearInterval(interval);

        await voting.endElection({ from: admin });
        const result = await voting.declareWinner({ from: admin });

        const winnerId = result[0].toNumber();
        const winnerName = result[1];
        const maxVotes = result[2].toNumber();
        setWinner({ candidateId: winnerId, name: winnerName, votes: maxVotes });

        const candidateCount = (await voting.candidateCount()).toNumber();
        let total = 0;
        const fetchedCandidates: Candidate[] = [];

        for (let i = 0; i < candidateCount; i++) {
          const c = await voting.Candidates(i);
          const votes = c.votes.toNumber();
          fetchedCandidates.push({
            candidateId: i + 1,
            name: c.name,
            slogan: c.slogan,
            votes,
          });
          total += votes;
        }

        fetchedCandidates.sort((a, b) => b.votes - a.votes);
        setCandidates(fetchedCandidates);
        setTotalVotes(total);

        // showToast("Election results loaded", "success", toastId);
      } catch (error) {
        console.error("Error fetching results:", error);
        showToast("Error fetching election results", "error", toastId);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Election Results
        </h1>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 w-full">
            <div className="w-full max-w-xl">
              <p className="text-indigo-300 text-sm mb-1">
                Voting ends in{" "}
                {timeLeftSeconds !== null
                  ? formatSecondsToHHMMSS(timeLeftSeconds)
                  : "..."}
              </p>
              <div className="w-full bg-gray-700 h-4 rounded-full">
                <div
                  className="bg-indigo-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${timeLeftPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
            <p className="text-indigo-300 text-lg font-semibold">
              {loadingMessages[loadingMessageIndex]}
            </p>
            <p className="text-sm text-indigo-200">
              Please wait while we tally the votes...
            </p>
          </div>
        )}

        {!winner && !loading && (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-indigo-400 mb-4">
                No results available.
              </h2>
              <p className="text-indigo-200">Please check back later.</p>
            </div>
          </div>
        )}

        {winner && !loading && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl mx-auto bg-gray-800 rounded-lg p-6 mb-8 text-center shadow-lg"
            >
              <h2 className="text-2xl font-bold mb-4">Winner</h2>
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 p-4 rounded-lg">
                <h3 className="text-xl font-semibold">{winner.name}</h3>
                <p className="text-white/80">Candidate ID: {winner.candidateId}</p>
                <p className="text-lg mt-2">Votes: {winner.votes}</p>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {candidates.map((candidate, index) => (
                <div
                  key={candidate.candidateId}
                  className={`bg-gray-800 rounded-lg p-6 ${
                    index === 0 ? "border-4 border-indigo-600" : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{candidate.name}</h2>
                    <span className="text-lg font-bold text-indigo-400">
                      {totalVotes
                        ? ((candidate.votes / totalVotes) * 100).toFixed(1)
                        : "0"}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                    <div
                      className="bg-indigo-600 h-4 rounded-full"
                      style={{
                        width: `${
                          totalVotes
                            ? ((candidate.votes / totalVotes) * 100).toFixed(1)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-indigo-200">{candidate.votes} Total Votes</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-xl">
                Total Votes Cast:{" "}
                <span className="font-bold text-indigo-400">{totalVotes}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
