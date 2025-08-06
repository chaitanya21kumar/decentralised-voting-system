// app/voter/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Web3 from "web3";
import axios from "axios";

import SignHeader from "@/components/ui/signHeader";
import { showToast, showToastPromise } from "../../pages/api/admin/showToast";
import { votingAbi, votingAddress } from "../artifacts/votingArtifact.js";

/* ───── lazy-load webcam component ───── */
const FaceVerification = dynamic(
  () => import("@/components/ui/FaceVerification"),
  { ssr: false }
);

interface Candidate {
  candidateId: number;
  name: string;
  slogan: string;
  votes: number;
}

export default function VotingPage() {
  const router = useRouter();

  /* ──────────── state ──────────── */
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterDetails, setVoterDetails] = useState({
    rollNumber: "",
    accountnumber: "",
    name: "",
    phoneNumber: "",
  });

  const [faceVerified, setFaceVerified] = useState(false);
  const [blockchainVerified, setBlockchainVerified] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [votingActive, setVotingActive] = useState(false);
  const [electionStatus, setElectionStatus] = useState("");
  const fetchedOnce = useRef(false);

  /* ───────── helpers ───────── */
  const getContract = async () => {
    const web3 = new Web3("http://127.0.0.1:8545");
    const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    return { voting, adminAccount: accounts[0] };
  };

  const checkElectionStatus = async () => {
    try {
      const { voting } = await getContract();
      const [votingStart, votingEnd, isPaused] = await Promise.all([
        voting.methods.votingStart().call(),
        voting.methods.votingEnd().call(),
        voting.methods.isPaused().call(),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(votingStart);
      const endTime = Number(votingEnd);

      if (isPaused) {
        setElectionStatus("Election is paused");
        setVotingActive(false);
      } else if (now < startTime) {
        setElectionStatus("Election not started yet");
        setVotingActive(false);
      } else if (now > endTime) {
        setElectionStatus("Election has ended");
        setVotingActive(false);
      } else {
        setElectionStatus("Election is active");
        setVotingActive(true);
      }
    } catch (error) {
      console.error("Error checking election status:", error);
      setElectionStatus("Unable to check election status");
      setVotingActive(false);
    }
  };

  const checkVotingStatus = async (voterAddress: string) => {
    try {
      const { voting } = await getContract();
      // Check if voter has already voted by calling a view function on the contract
      // Note: This assumes there's a hasVoted mapping or similar function in the contract
      const votedStatus = await voting.methods.hasVoted(voterAddress).call();
      setHasVoted(votedStatus);
      
      if (votedStatus) {
        setElectionStatus("You have already voted");
        showToast("You have already cast your vote in this election.", "error");
      }
    } catch (error) {
      console.error("Error checking voting status:", error);
    }
  };

  /* ───── load candidates once ───── */
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    // Check election status first
    checkElectionStatus();

    axios
      .get("/api/admin/getCandidates")
      .then((res) => {
        if (res.data.success) {
          setCandidates(
            res.data.candidates.map((c: any, i: number) => ({
              candidateId: i + 1,
              name: c.name,
              slogan: c.agenda || c.slogan || "No agenda provided",
              votes: 0,
            }))
          );
        } else showToast("Failed to load candidates", "error");
      })
      .catch(() => showToast("Error loading candidates", "error"));
  }, []);

  /* ───── load voter session ───── */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/voter/me");
        if (res.data.authenticated) {
          const voterData = {
            phoneNumber: res.data.phoneNumber,
            name: res.data.name,
            accountnumber: res.data.accountNumber,
          };
          
          setVoterDetails((prev) => ({
            ...prev,
            ...voterData
          }));

          // Check if this voter has already voted
          if (voterData.accountnumber) {
            await checkVotingStatus(voterData.accountnumber);
          }
        } else showToast("You must be signed in.", "error");
      } catch {
        showToast("Error fetching session.", "error");
      }
    })();
  }, []);

  /* ───── on-chain verify ───── */
  const handleVerifyOnChain = async () => {
    if (!faceVerified) {
      showToast("Complete face verification first.", "error");
      return;
    }
    if (!voterDetails.rollNumber.trim()) {
      showToast("Enter your roll number.", "error");
      return;
    }

    const { rollNumber, accountnumber } = voterDetails;

    const verifyPromise = (async () => {
      // First, get voter details including DID from database
      const voterResponse = await axios.post("/api/verify-voter", { rollNumber });
      if (!voterResponse.data.success) {
        throw new Error("Voter not found in database");
      }
      
      const voterData = voterResponse.data.voter;
      const voterDID = voterData.rollNumber; // This is the IPFS hash used as DID
      
      // Now verify on blockchain with correct DID
      const { voting, adminAccount } = await getContract();
      await voting.methods
        .verifyVoter(accountnumber, voterDID)
        .send({ from: adminAccount, gas: 300_000 });
      setBlockchainVerified(true);
    })();

    showToastPromise(verifyPromise, {
      loading: "Verifying voter…",
      success: "✅ Voter verified!",
      error: "Verification failed.",
    });
  };

  /* ───── vote handler ───── */
  const handleVote = async () => {
    if (!blockchainVerified || selected === null) {
      showToast("Verify & select a candidate first.", "error");
      return;
    }

    if (hasVoted) {
      showToast("You have already voted in this election.", "error");
      return;
    }

    if (!votingActive) {
      showToast("Voting is not currently active.", "error");
      return;
    }

    try {
      const { voting } = await getContract();
      
      // Double-check voting status before submitting
      const currentVotedStatus = await voting.methods.hasVoted(voterDetails.accountnumber).call();
      if (currentVotedStatus) {
        setHasVoted(true);
        showToast("You have already voted in this election.", "error");
        return;
      }

      const tx = voting.methods
        .vote(selected - 1)
        .send({ from: voterDetails.accountnumber, gas: 300_000 });

      showToastPromise(tx, {
        loading: "Casting your vote…",
        success: "✅ Vote cast! Redirecting…",
        error: "❌ Vote failed.",
      }).then(() => {
        setHasVoted(true);
        router.push("/results");
      });
    } catch (error: any) {
      console.error("Vote error:", error);
      if (error.message && error.message.includes("Already voted")) {
        setHasVoted(true);
        showToast("You have already voted in this election.", "error");
      } else {
        showToast("Failed to cast vote. Please try again.", "error");
      }
    }
  };

  /* ──────────── UI ──────────── */
  return (
    <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white min-h-screen">
      <SignHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Cast Your Vote
          </h1>
          <p className="text-gray-400 text-lg">
            Secure, transparent, and decentralized voting
          </p>
          
          {/* Election Status Banner */}
          {electionStatus && (
            <div className={`inline-flex items-center px-6 py-3 rounded-full mt-4 ${
              votingActive 
                ? 'bg-green-900/30 border border-green-500/30 text-green-400' 
                : 'bg-red-900/30 border border-red-500/30 text-red-400'
            }`}>
              <div className={`w-3 h-3 rounded-full mr-3 ${
                votingActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              {electionStatus}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: "Identity Verification", active: !faceVerified },
              { step: 2, title: "Blockchain Verification", active: faceVerified && !blockchainVerified },
              { step: 3, title: hasVoted ? "Vote Completed" : "Cast Vote", active: blockchainVerified }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold ${
                  item.step === 1 && faceVerified ? 'bg-green-600 border-green-600' :
                  item.step === 2 && blockchainVerified ? 'bg-green-600 border-green-600' :
                  item.step === 3 && hasVoted ? 'bg-green-600 border-green-600' :
                  item.active ? 'border-indigo-500 bg-indigo-500' : 'border-gray-600 bg-gray-800'
                }`}>
                  {(item.step === 1 && faceVerified) || (item.step === 2 && blockchainVerified) || (item.step === 3 && hasVoted) ? '✓' : item.step}
                </div>
                <span className={`ml-3 font-medium ${
                  item.active ? 'text-indigo-400' : 
                  hasVoted && item.step === 3 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {item.title}
                </span>
                {index < 2 && (
                  <div className={`w-16 h-1 mx-4 rounded ${
                    (item.step === 1 && faceVerified) || (item.step === 2 && blockchainVerified) || (item.step === 3 && hasVoted)
                      ? 'bg-green-600' : 'bg-gray-700'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Identity Verification */}
        {!faceVerified && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-indigo-400">Identity Verification</h2>
                <p className="text-gray-400">Enter your roll number and complete face verification</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Roll Number</label>
                  <input
                    type="text"
                    value={voterDetails.rollNumber}
                    onChange={(e) =>
                      setVoterDetails((p) => ({ ...p, rollNumber: e.target.value }))
                    }
                    placeholder="Enter your roll number"
                    className="w-full p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>

                {voterDetails.rollNumber.trim() && (
                  <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-600">
                    <h3 className="text-lg font-semibold mb-4 text-center">Face Verification</h3>
                    <FaceVerification
                      rollNumber={voterDetails.rollNumber.trim()}
                      onVerified={() => setFaceVerified(true)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 : on-chain verify ─────────────────────────── */}
        {faceVerified && (
          <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Step 2 : Verify on Blockchain
            </h2>

            {blockchainVerified ? (
              <p className="text-green-400">
                ✅ Hello {voterDetails.name}, you’re verified!
              </p>
            ) : (
              <button
                onClick={handleVerifyOnChain}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verify on Blockchain
                </span>
              </button>
            )}
          </div>
        )}

        {/* Already Voted Message */}
        {hasVoted && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-green-400">Vote Successfully Cast!</h2>
              <p className="text-green-300 text-lg mb-6">
                Thank you, {voterDetails.name}! Your vote has been recorded on the blockchain.
              </p>
              <p className="text-gray-400 mb-6">
                You have already participated in this election. Each voter can only cast one vote.
              </p>
              <button
                onClick={() => router.push("/results")}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                View Election Results
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Candidates Selection */}
        {blockchainVerified && !hasVoted && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 text-indigo-400">Select Your Candidate</h2>
              <p className="text-gray-400">Choose wisely - your vote matters!</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {candidates.map((c) => (
                <div
                  key={c.candidateId}
                  onClick={() => blockchainVerified && setSelected(c.candidateId)}
                  className={`
                    relative bg-gray-800/50 backdrop-blur-sm border rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${!blockchainVerified ? "opacity-50 cursor-not-allowed" : ""}
                    ${
                      selected === c.candidateId
                        ? "border-indigo-500 bg-indigo-900/30 shadow-2xl shadow-indigo-500/20"
                        : "border-gray-700/50 hover:border-gray-600 hover:bg-gray-700/30"
                    }
                  `}
                >
                  {selected === c.candidateId && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-white">{c.candidateId}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">{c.name}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">"{c.slogan}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Candidates (when not verified) ─────────────────────────────────────── */}
        {!blockchainVerified && candidates.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto opacity-50">
            {candidates.map((c) => (
              <div
                key={c.candidateId}
                className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 cursor-not-allowed"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-gray-400">{c.candidateId}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-400">{c.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">"{c.slogan}"</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Vote Button */}
        {blockchainVerified && !hasVoted && (
          <div className="text-center">
            <button
              onClick={handleVote}
              disabled={!blockchainVerified || selected === null || !votingActive || hasVoted}
              className={`
                px-12 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform focus:outline-none focus:ring-2
                ${
                  blockchainVerified && selected !== null && votingActive && !hasVoted
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:scale-105 focus:ring-green-500/50 shadow-lg shadow-green-500/25"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              {hasVoted ? (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Already Voted
                </span>
              ) : !votingActive ? (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Voting Not Active
                </span>
              ) : selected === null ? (
                "Select a Candidate First"
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Vote
                </span>
              )}
            </button>
            
            {selected !== null && votingActive && !hasVoted && (
              <p className="text-gray-400 mt-4">
                You are voting for: <span className="font-semibold text-indigo-400">
                  {candidates.find(c => c.candidateId === selected)?.name}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
