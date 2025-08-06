// app/results/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Web3 from "web3";
import { motion } from "framer-motion";
import SignHeader from "@/components/ui/signHeader";
import { votingAbi, votingAddress } from "../artifacts/votingArtifact.js";

interface Candidate {
  candidateId: number;
  name:        string;
  slogan:      string;
  votes:       number;
}

interface Winner {
  candidateId: number;
  name:        string;
  votes:       number;
}

const loadingMessages = [
  "Counting votes securely…",
  "Analyzing on-chain data…",
  "Finalizing results…",
];

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
  const [winner,     setWinner]     = useState<Winner|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [msgIndex,   setMsgIndex]   = useState(0);
  const [timeLeft,   setTimeLeft]   = useState<number|null>(null);
  const [percent,    setPercent]    = useState(100);

  const startRef = useRef<number>(0);
  const endRef   = useRef<number>(0);

  // cycle loading messages every 3s
  useEffect(() => {
    const iv = setInterval(() => {
      setMsgIndex(i => (i + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      const web3   = new Web3(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
      const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
      try {
        // First check if voting has been started
        const votingStart = Number(await voting.methods.votingStart().call());
        const votingEnd = Number(await voting.methods.votingEnd().call());
        const detailsSet = await voting.methods.detailsSet().call();
        
        // If no election has been set up or started, show appropriate message
        if (!detailsSet || votingStart === 0) {
          setLoading(false);
          return;
        }

        // get votingEnd timestamp on-chain
        endRef.current   = votingEnd;
        // grab the block timestamp when we start
        const block      = await web3.eth.getBlock("latest");
        startRef.current = Number(block.timestamp);

        // If voting is still ongoing, show countdown
        if (Date.now() / 1000 < votingEnd) {
          // update progress bar until votingEnd
          const barInterval = setInterval(() => {
            const now     = Date.now() / 1000;
            const total   = endRef.current - startRef.current;
            const elapsed = now - startRef.current;
            const left    = Math.max(0, endRef.current - now);
            setTimeLeft(left);
            setPercent(Math.max(0, 100 - (elapsed / total) * 100));
            if (now >= endRef.current) {
              clearInterval(barInterval);
              // Refresh the page to show results
              window.location.reload();
            }
          }, 1000);

          return; // Stay in loading state while voting is active
        }

        // Voting has ended, fetch results
        const count = Number(await voting.methods.getCandidateCount().call());
        const arr: Candidate[] = [];
        for (let i = 0; i < count; i++) {
          const c: any = await voting.methods.candidates(i).call();
          arr.push({
            candidateId: i + 1,
            name:        c.name,
            slogan:      c.slogan,
            votes:       Number(c.votes),
          });
        }

        // pick the top vote-getter
        let top = arr[0] || null;
        for (const cand of arr) {
          if (top === null || cand.votes > top.votes) top = cand;
        }

        setCandidates(arr);
        if (top) setWinner({ candidateId: top.candidateId, name: top.name, votes: top.votes });
      } catch (err) {
        console.error("Results fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Loading state - voting active or not started
  if (loading) {
    return (
      <section className="bg-gray-950 text-white min-h-screen flex flex-col items-center justify-center space-y-4">
        {timeLeft !== null ? (
          <>
            <p className="text-indigo-300">
              Voting ends in{" "}
              {formatSecondsToHHMMSS(timeLeft)}
            </p>
            <div className="w-full max-w-md bg-gray-700 h-3 rounded-full">
              <div
                className="h-3 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"/>
            <p className="text-indigo-300 font-semibold">
              {loadingMessages[msgIndex]}
            </p>
          </>
        ) : (
          <>
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4">Election Not Started</h2>
              <p className="text-gray-400 text-lg mb-2">
                The election has not been started by the admin yet.
              </p>
              <p className="text-gray-500">
                Please wait for the admin to set up and start the voting process.
              </p>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader/>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Election Results
        </h1>

        {!winner ? (
          <div className="text-center py-16">
            <p className="text-indigo-400 text-xl">No results available.</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg mx-auto bg-gray-800 p-6 rounded-lg mb-8 text-center shadow-lg"
            >
              <h2 className="text-2xl font-bold mb-2">Winner</h2>
              <p className="text-xl">{winner.name}</p>
              <p className="mt-1 text-white/80">
                Candidate ID: {winner.candidateId}
              </p>
              <p className="mt-2 text-lg text-green-400">
                Votes: {winner.votes}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {candidates.map((c, i) => (
                <div
                  key={c.candidateId}
                  className={`bg-gray-800 p-6 rounded-lg ${
                    c.candidateId === winner.candidateId
                      ? "border-4 border-indigo-600"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">{c.name}</h3>
                    <span className="text-indigo-400 font-bold">
                      {c.votes}
                    </span>
                  </div>
                  <p className="text-indigo-200 mb-2">"{c.slogan}"</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
