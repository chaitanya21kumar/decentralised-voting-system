"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Web3 from "web3";
import axios from "axios";
import SignHeader from "@/components/ui/signHeader";
import { showToast, showToastPromise } from "../../pages/api/admin/showToast";
import { votingAbi, votingAddress } from "../artifacts/votingArtifact";

interface Candidate {
  candidateId: number;
  name: string;
  slogan: string;
  votes: number;
}

export default function VotingPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterDetails, setVoterDetails] = useState({
    rollNumber: "",
    accountnumber: "",
    name: "",
    phoneNumber: "",
  });
  const [verified, setVerified] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [votingActive, setVotingActive] = useState(false);
  const [electionStatus, setElectionStatus] = useState("");
  const fetchedOnce = useRef(false);

  /* ───────── helpers ───────── */
  const getContract = async () => {
    const web3 = new Web3(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
    const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    return { voting, adminAccount: accounts[0] };
  };

  /* ───── check election status ───── */
  const checkElectionStatus = async () => {
    try {
      const { voting } = await getContract();
      const votingStart = Number(await voting.methods.votingStart().call());
      const votingEnd = Number(await voting.methods.votingEnd().call());
      const detailsSet = await voting.methods.detailsSet().call();
      const isPaused = await voting.methods.isPaused().call();
      
      const now = Math.floor(Date.now() / 1000);
      
      if (isPaused) {
        setElectionStatus("Election is paused by admin");
        setVotingActive(false);
      } else if (!detailsSet || votingStart === 0) {
        setElectionStatus("Election has not been started yet");
        setVotingActive(false);
      } else if (now < votingStart) {
        setElectionStatus("Election hasn't started yet");
        setVotingActive(false);
      } else if (now > votingEnd) {
        setElectionStatus("Election has ended");
        setVotingActive(false);
      } else {
        setElectionStatus("Election is active - you can vote!");
        setVotingActive(true);
      }
    } catch (error) {
      console.error("Error checking election status:", error);
      setElectionStatus("Error checking election status");
      setVotingActive(false);
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
        } else {
          showToast("Failed to load candidates", "error");
        }
      })
      .catch(() => showToast("Error loading candidates", "error"));
  }, []);

  useEffect(() => {
    const fetchVoter = async () => {
      try {
        const res = await axios.get("/api/admin/me");
        if (res.data.authenticated) {
          setVoterDetails((prev) => ({
            ...prev,
            phoneNumber: res.data.phoneNumber,
            name: res.data.name,
            accountnumber: res.data.accountNumber,
          }));
        } else {
          showToast("You must be signed in.", "error");
        }
      } catch {
        showToast("Error fetching session.", "error");
      }
    };

    fetchVoter();
  }, []);

  // helper to get contract + admin account
  const getContract = async () => {
    const web3 = new Web3("http://127.0.0.1:8545");
    const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    return { voting, adminAccount: accounts[0] };
  };

  // 2) Verify Voter
  const handleVerify = async () => {
    if (!voterDetails.rollNumber.trim()) {
      showToast("Enter your roll number.", "error");
      return;
    }

    const { rollNumber, accountnumber } = voterDetails;

    if (!rollNumber || !accountnumber) {
      showToast("Please fill all voter details.", "error");
      return;
    }

    const verifyPromise = (async () => {
      // First, get voter details including DID from database
      const voterResponse = await axios.post("/api/verify-voter", { rollNumber });
      if (!voterResponse.data.success) {
        throw new Error("Voter not found in database");
      }
      
      const voterData = voterResponse.data.voter;
      const voterDID = voterData.did; // This is the IPFS hash used as DID
      
      // Now verify on blockchain with correct DID
      const { voting, adminAccount } = await getContract();
      await voting.methods
        .verifyVoter(accountnumber, voterDID)
        .send({ from: adminAccount, gas: 300_000 });
      setVerified(true); // Set verified to true after successful verification
    })();

    showToastPromise(verifyPromise, {
      loading: "Verifying voter…",
      success: "✅ Voter verified!",
      error: (err) => {
        const message = err?.message || "";
        if (message.includes("Not registered")) return "You are not registered to vote.";
        if (message.includes("DID mismatch")) return "Verification failed: Identity mismatch.";
        if (message.includes("Voter not found")) return "Voter not found in database.";
        if (message.includes("Already verified")) return "You are already verified.";
        return "Verification failed. Please try again.";
      },
    });
  };

  // 3) Cast vote
  const handleVote = async () => {
    if (!votingActive) {
      showToast("Voting is not currently active. " + electionStatus, "error");
      return;
    }
    
    if (!blockchainVerified || selected === null) {
      showToast("Verify & select a candidate first.", "error");
      return;
    }

    const { voting } = await getContract();
    const tx = voting.methods
      .vote(selected - 1)
      .send({ from: voterDetails.accountnumber, gas: 300_000 });

    showToastPromise(tx, {
      loading: "Casting your vote…",
      success: "✅ Vote cast! Redirecting…",
      error: "❌ Vote failed.",
    }).then(() => router.push("/results"));
  };

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-4">Cast Your Vote</h1>
        
        {/* Election Status Banner */}
        <div className={`max-w-md mx-auto p-4 rounded-lg mb-8 text-center ${
          votingActive ? 'bg-green-800 border border-green-600' : 'bg-red-800 border border-red-600'
        }`}>
          <p className={`font-semibold ${votingActive ? 'text-green-200' : 'text-red-200'}`}>
            {electionStatus}
          </p>
          {!votingActive && (
            <p className="text-sm text-gray-400 mt-2">
              Please contact the admin or wait for the election to begin.
            </p>
          )}
        </div>

        {/* ── Step 1 : roll # + face ───────────────────────────── */}
        {!faceVerified && (
          <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Step 1 : Roll&nbsp;Number + Face Check
            </h2>

            {/* roll number input */}
            <input
              type="text"
              value={voterDetails.rollNumber}
              onChange={(e) =>
                setVoterDetails((p) => ({ ...p, rollNumber: e.target.value }))
              }
              placeholder="Enter Roll Number"
              className="w-full mb-4 p-2 bg-gray-700 rounded"
            />

            {/* webcam appears only after roll # entered */}
            {voterDetails.rollNumber.trim() && (
              <FaceVerification
                rollNumber={voterDetails.rollNumber.trim()}
                onVerified={() => setFaceVerified(true)}
              />
            )}
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
                onClick={handleVerify}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded"
              >
                Verify Voter
              </button>
            </>
          )}
        </div>

        {/* Candidates */}
        <div className="grid md:grid-cols-3 gap-6">
          {candidates.map((c) => (
            <div
              key={c.candidateId}
              onClick={() => verified && setSelected(c.candidateId)}
              className={`
                bg-gray-800 rounded-lg p-6 cursor-pointer transition
                ${!verified ? "opacity-50 cursor-not-allowed" : ""}
                ${
                  selected === c.candidateId
                    ? "border-4 border-indigo-600"
                    : "hover:bg-gray-700"
                }
              `}
            >
              <h2 className="text-xl font-semibold mb-2">{c.name}</h2>
              <p className="text-indigo-200">"{c.slogan}"</p>
            </div>
          ))}
        </div>

        {/* Submit Vote */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleVote}
            disabled={!blockchainVerified || selected === null || !votingActive}
            className={`
              px-6 py-3 rounded text-white
              ${
                blockchainVerified && selected !== null && votingActive
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-600 cursor-not-allowed"
              }
            `}
          >
            {!votingActive ? "Voting Not Active" : "Submit Vote"}
          </button>
        </div>
      </div>
    </section>
  );
}