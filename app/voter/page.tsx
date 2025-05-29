"use client";

import React, { useEffect, useRef, useState } from "react";
const Web3 = require("web3");
const contract = require("@truffle/contract");
import axios from "axios";
import artifact from "../../build/contracts/Voting.json";
import SignHeader from "@/components/ui/signHeader";
import toast from "react-hot-toast";
import { showToast, showToastPromise } from "../../pages/api/admin/showToast";

interface Candidate {
  candidateId: number;
  name: string;
  slogan: string;
  votes: number;
}

export default function VotingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [voterDetails, setVoterDetails] = useState({
    rollNumber: "",
    accountnumber: "",
    name: "",
    phoneNumber: "",
  });
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
    const hasRun=useRef(false);

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
          showToast("You must be signed in to access this page.", "error");
        }
      } catch {
        showToast("Error fetching voter session.", "error");
      }
    };

    fetchVoter();
  }, []);

  useEffect(() => {
     if (hasRun.current) return; 
    hasRun.current = true; 
    if (candidatesLoaded) return;

    const fetchCandidates = async () => {
      const toastId = toast.loading("Fetching candidates...");
      try {
        const res = await axios.get("/api/admin/getCandidates");
        if (res.data.success) {
          const formatted = res.data.candidates.map((c: any, i: number) => ({
            candidateId: i + 1,
            name: c.name,
            slogan: c.agenda || c.slogan || "",
            votes: 0,
          }));
          setCandidates(formatted);
          toast.dismiss(toastId);
          showToast("Candidates loaded", "success");
          setCandidatesLoaded(true);
        } else {
          toast.dismiss(toastId);
          showToast("Failed to load candidates", "error");
        }
      } catch {
        toast.dismiss(toastId);
        showToast("Error loading candidate list.", "error");
      }
    };

    fetchCandidates();
  }, [candidatesLoaded]);

  const getContractInstance = async () => {
    const provider =
      typeof window !== "undefined" && (window as any).ethereum
        ? new Web3((window as any).ethereum)
        : new Web3.providers.HttpProvider("http://127.0.0.1:8545");

    const web3 = new Web3(provider);
    const Voting = contract(artifact);
    Voting.setProvider(provider);

    if (typeof Voting.currentProvider.sendAsync !== "function") {
      Voting.currentProvider.sendAsync = function (...args: any[]) {
        return Voting.currentProvider.send.apply(Voting.currentProvider, args);
      };
    }

    const accounts = await web3.eth.getAccounts();
    const instance = await Voting.deployed();
    return { voting: instance, account: accounts[0] };
  };

  const handleRegister = async () => {
    const { name, phoneNumber, rollNumber, accountnumber } = voterDetails;

    if (!name || !phoneNumber || !rollNumber || !accountnumber) {
      showToast("Please fill all voter details.", "error");
      return;
    }

    const verifyPromise = (async () => {
      const { voting, account } = await getContractInstance();
      await voting.verifyVoter(accountnumber, rollNumber, { from: account });
    })();

    showToastPromise(verifyPromise, {
      loading: "Verifying voter...",
      success: "Voter verified!",
      error: (err) => {
        const message = err?.message || "";
        if (message.includes("not verified")) return "You are not a verified voter.";
        if (message.includes("Invalid account")) return "Invalid account address.";
        if (message.includes("Invalid roll number")) return "Invalid roll number.";
        return "Verification failed.";
      },
    });
  };

  const handleVote = async () => {
    if (selectedCandidate === null) {
      showToast("Please select a candidate.", "error");
      return;
    }

    const votePromise = (async () => {
      const { voting } = await getContractInstance();
      const candidateIndex = selectedCandidate - 1;
      await voting.vote(candidateIndex, { from: voterDetails.accountnumber });
    })();

    showToastPromise(votePromise, {
      loading: "Casting your vote...",
      success: `Vote cast successfully for candidate ID ${selectedCandidate}`,
      error: (err) => {
        const message = err?.message || "";
        if (message.includes("Not verified")) return "You are not a verified voter.";
        if (message.includes("Already voted")) return "You have already voted.";
        if (message.includes("Invalid candidate")) return "Invalid candidate selected.";
        if (message.includes("Vote limit reached")) return "Vote limit reached.";
        if (message.includes("Voting is not active")) return "Voting has ended.";
        if (message.includes("Voter not registered")) return "You are not registered to vote.";
        if (message.includes("Invalid account")) return "Invalid account address.";
        return "Voting failed.";
      },
    });
  };

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Cast Your Vote
        </h1>

        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Voter Registration</h2>
          <input
            type="text"
            placeholder="Roll Number"
            value={voterDetails.rollNumber}
            onChange={(e) => setVoterDetails({ ...voterDetails, rollNumber: e.target.value })}
            className="w-full mb-4 p-2 bg-gray-700 rounded"
          />
          <button
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
            onClick={handleRegister}
          >
            Verify Voter
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div
              key={candidate.candidateId}
              onClick={() => setSelectedCandidate(candidate.candidateId)}
              className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition ${
                selectedCandidate === candidate.candidateId
                  ? "border-4 border-indigo-600"
                  : "hover:bg-gray-700"
              }`}
            >
              <h2 className="text-xl font-semibold mb-2">{candidate.name}</h2>
              <p className="text-indigo-200 mb-4">"{candidate.slogan}"</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={handleVote}
            disabled={!selectedCandidate}
            className={`px-6 py-3 rounded text-white ${
              selectedCandidate ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            Submit Vote
          </button>
        </div>
      </div>
    </section>
  );
}
