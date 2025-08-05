// app/voter/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Web3 from "web3";
import axios from "axios";

import SignHeader from "@/components/ui/signHeader";
import { showToast, showToastPromise } from "../../pages/api/admin/showToast";
import { votingAbi, votingAddress } from "../artifacts/votingArtifact";

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
          setVoterDetails((prev) => ({
            ...prev,
            phoneNumber: res.data.phoneNumber,
            name: res.data.name,
            accountnumber: res.data.accountNumber,
          }));
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
      const voterDID = voterData.did; // This is the IPFS hash used as DID
      
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

  /* ──────────── UI ──────────── */
  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Cast Your Vote</h1>

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
                onClick={handleVerifyOnChain}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded"
              >
                Verify Voter
              </button>
            )}
          </div>
        )}

        {/* ── Candidates ─────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6">
          {candidates.map((c) => (
            <div
              key={c.candidateId}
              onClick={() =>
                blockchainVerified && setSelected(c.candidateId)
              }
              className={`
                bg-gray-800 rounded-lg p-6 cursor-pointer transition
                ${
                  !blockchainVerified ? "opacity-50 cursor-not-allowed" : ""
                }
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

        {/* ── Submit Vote ─────────────────────────────────────── */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleVote}
            disabled={!blockchainVerified || selected === null}
            className={`
              px-6 py-3 rounded text-white
              ${
                blockchainVerified && selected !== null
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
