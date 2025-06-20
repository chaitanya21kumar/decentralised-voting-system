// app/voter/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter }                      from "next/navigation";
import Web3                               from "web3";
import axios                              from "axios";
import SignHeader                         from "@/components/ui/signHeader";
import { showToast, showToastPromise }    from "../../pages/api/admin/showToast";
import { votingAbi, votingAddress }       from "../artifacts/votingArtifact";

interface Candidate {
  candidateId: number;
  name:        string;
  slogan:      string;
  votes:       number;
}

// include the DID here
interface VoterSession {
  rollNumber:    string;
  accountNumber: string;
  name:          string;
  phoneNumber:   string;
  did:           string;
}

export default function VotingPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rollInput, setRollInput]   = useState("");
  const [voter, setVoter]           = useState<VoterSession|null>(null);
  const [verified, setVerified]     = useState(false);
  const [selected, setSelected]     = useState<number|null>(null);
  const fetchedOnce                 = useRef(false);

  // 1) Load candidates
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    axios.get("/api/admin/getCandidates")
      .then(res => {
        if (res.data.success) {
          setCandidates(res.data.candidates.map((c: any, i: number) => ({
            candidateId: i + 1,
            name:        c.name,
            slogan:      c.agenda || c.slogan || "",
            votes:       0
          })));
        } else {
          showToast("Failed to load candidates", "error");
        }
      })
      .catch(() => showToast("Error loading candidates", "error"));
  }, []);

  // helper to get contract + admin account
  const getContract = async () => {
    const web3     = new Web3("http://127.0.0.1:8545");
    const voting   = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    return { voting, adminAccount: accounts[0] };
  };

  // 2) Verify Voter
  const handleVerify = async () => {
    if (!rollInput.trim()) {
      showToast("Enter your roll number.", "error");
      return;
    }

    // 2-A) off-chain
    let v: VoterSession;
    try {
      const res = await axios.post("/api/verify-voter", { rollNumber: rollInput });
      if (!res.data.success) {
        throw new Error(res.data.message);
      }
      v = res.data.voter;
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Verification failed.", "error");
      return;
    }

    // 2-B) on-chain with the real DID
    const { voting, adminAccount } = await getContract();
    const tx = voting.methods
      .verifyVoter(v.accountNumber, v.did)
      .send({ from: adminAccount, gas: 200_000 });

    showToastPromise(tx, {
      loading: "Verifying on-chain…",
      success: "✅ Voter verified!",
      error:   "❌ On-chain verification failed.",
    }).then(() => {
      setVoter(v);
      setVerified(true);
    });
  };

  // 3) Cast vote
  const handleVote = async () => {
    if (!verified || !voter) {
      showToast("You must verify first.", "error");
      return;
    }
    if (selected === null) {
      showToast("Select a candidate.", "error");
      return;
    }

    const { voting } = await getContract();
    const tx = voting.methods
      .vote(selected - 1)
      .send({ from: voter.accountNumber, gas: 300_000 });

    showToastPromise(tx, {
      loading: "Casting your vote…",
      success: "✅ Vote cast! Redirecting…",
      error:   "❌ Vote failed.",
    }).then(() => router.push("/results"));
  };

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader/>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Cast Your Vote</h1>

        {/* Voter Verification */}
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Voter Verification</h2>
          {verified && voter ? (
            <p className="text-green-400">✅ Hello {voter.name}, you’re verified!</p>
          ) : (
            <>
              <input
                type="text"
                value={rollInput}
                onChange={e => setRollInput(e.target.value)}
                placeholder="Enter Roll Number"
                className="w-full mb-4 p-2 bg-gray-700 rounded"
              />
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
          {candidates.map(c => (
            <div
              key={c.candidateId}
              onClick={() => verified && setSelected(c.candidateId)}
              className={`
                bg-gray-800 rounded-lg p-6 cursor-pointer transition
                ${!verified ? "opacity-50 cursor-not-allowed" : ""}
                ${selected === c.candidateId
                  ? "border-4 border-indigo-600"
                  : "hover:bg-gray-700"}
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
            disabled={!verified || selected === null}
            className={`
              px-6 py-3 rounded text-white
              ${verified && selected !== null
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-gray-600 cursor-not-allowed"}
            `}
          >
            Submit Vote
          </button>
        </div>
      </div>
    </section>
  );
}
