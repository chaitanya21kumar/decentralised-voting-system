"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Web3 from "web3";
import axios from "axios";

import SignHeader                    from "@/components/ui/signHeader";
import FaceSetup                     from "@/components/ui/FaceSetup";
import {
  loadModels,
  getFaceEmbedding,
  faceDistance,
}                                     from "@/lib/face";

import { showToast, showToastPromise } from "../../pages/api/admin/showToast";
import { votingAbi, votingAddress }    from "../artifacts/votingArtifact";

interface Candidate {
  candidateId: number;
  name: string;
  slogan: string;
  votes: number;
}

export default function VotingPage() {
  const router = useRouter();

  /* ─────────────────────────────── state ─────────────────────────────── */
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterDetails, setVoterDetails] = useState({
    rollNumber   : "",
    accountnumber: "",
    name         : "",
    phoneNumber  : "",
  });
  const [verified, setVerified]         = useState(false);
  const [selected, setSelected]         = useState<number | null>(null);
  const [referenceEmb, setReferenceEmb] = useState<number[] | null>(null);
  const [needSetup, setNeedSetup]       = useState(true);

  const fetchedOnce = useRef(false);
  const liveVideo   = useRef<HTMLVideoElement>(null);   // hidden live feed for match

  /* ─────────────────── 1) load candidate list (once) ─────────────────── */
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    axios.get("/api/admin/getCandidates")
      .then(res => {
        if (res.data.success) {
          setCandidates(
            res.data.candidates.map((c: any, i: number) => ({
              candidateId: i + 1,
              name       : c.name,
              slogan     : c.agenda || c.slogan || "",
              votes      : 0,
            }))
          );
        } else showToast("Failed to load candidates", "error");
      })
      .catch(() => showToast("Error loading candidates", "error"));
  }, []);

  /* ─────────── 2) fetch voter session (name + eth account) ──────────── */
  useEffect(() => {
    const fetchVoter = async () => {
      try {
        const res = await axios.get("/api/admin/me");
        if (res.data.authenticated) {
          setVoterDetails(prev => ({
            ...prev,
            phoneNumber  : res.data.phoneNumber,
            name         : res.data.name,
            accountnumber: res.data.accountNumber,
          }));
        } else showToast("You must be signed in to access this page.", "error");
      } catch {
        showToast("Error fetching voter session.", "error");
      }
    };
    fetchVoter();
  }, []);

  /* ───────── helper to get contract instance + admin account ────────── */
  const getContract = async () => {
    const web3     = new Web3("http://127.0.0.1:8545");
    const voting   = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    return { voting, adminAccount: accounts[0] };
  };

  /* ─────────────────────── 3) on-chain voter verify ─────────────────── */
  const handleVerify = async () => {
    const { rollNumber, accountnumber } = voterDetails;
    if (!rollNumber.trim() || !accountnumber)
      return showToast("Fill in roll number first.", "error");

    const verifyPromise = (async () => {
      const { voting, adminAccount } = await getContract();
      await voting.methods
        .verifyVoter(accountnumber, rollNumber)
        .send({ from: adminAccount, gas: 300_000 });

      setVerified(true);
    })();

    showToastPromise(verifyPromise, {
      loading: "Verifying voter…",
      success: "Voter verified ✅",
      error  : "Verification failed.",
    });
  };

  /* ─────────────────────── 4) cast vote with face-ID ─────────────────── */
  const handleVote = async () => {
    if (!verified)        return showToast("Verify first.", "error");
    if (!referenceEmb)    return showToast("Please finish face setup.", "error");
    if (selected === null) return showToast("Select a candidate.", "error");

    /* 4-a capture a live embedding */
    await loadModels();                                   // no-op if already loaded
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (liveVideo.current) liveVideo.current.srcObject = stream;

    // wait for camera to warm up a tad
    await new Promise(r => setTimeout(r, 600));

    const liveEmb = await getFaceEmbedding(liveVideo.current!);
    stream.getTracks().forEach(t => t.stop());            // close cam

    if (!liveEmb)
      return showToast("Face not detected.", "error");

    if (faceDistance(liveEmb, referenceEmb) > 0.45)
      return showToast("Face mismatch.", "error");

    /* 4-b call smart-contract vote */
    const { voting } = await getContract();
    const tx = voting.methods
      .vote(selected - 1)
      .send({ from: voterDetails.accountnumber, gas: 300_000 });

    showToastPromise(tx, {
      loading: "Casting vote…",
      success: "✅ Vote cast! Redirecting…",
      error  : "❌ Vote failed.",
    }).then(() => router.push("/results"));
  };

  /* ────────────────────────────── render ────────────────────────────── */
  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader />

      {/* hidden video element for live match */}
      <video ref={liveVideo} style={{ display: "none" }} muted autoPlay />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Cast Your Vote</h1>

        {/* STEP 0 – Face reference setup */}
        {needSetup && (
          <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Face ID Setup (one-time)</h2>
            <FaceSetup
              onComplete={(emb) => {
                setReferenceEmb(emb);
                setNeedSetup(false);
                showToast("Face saved!", "success");
              }}
            />
          </div>
        )}

        {/* Voter Verification */}
        {!needSetup && (
          <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Voter Verification</h2>
            {verified ? (
              <p className="text-green-400">
                ✅ Hello {voterDetails.name}, you’re verified!
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={voterDetails.rollNumber}
                  onChange={(e) =>
                    setVoterDetails(prev => ({ ...prev, rollNumber: e.target.value }))
                  }
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
        )}

        {/* Candidates list */}
        {!needSetup && (
          <>
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
                disabled={!verified || selected === null}
                className={`
                  px-6 py-3 rounded text-white
                  ${
                    verified && selected !== null
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-600 cursor-not-allowed"
                  }
                `}
              >
                Submit Vote
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
