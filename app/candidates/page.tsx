"use client";
import React, { use, useEffect, useRef, useState } from "react";
import axios from "axios";
import SignHeader from "@/components/ui/signHeader";
import { showToast } from "../../pages/api/admin/showToast";
import toast from "react-hot-toast";

type Candidate = {
  candidateId?: number;
  name: string;
  party?: string;
  agenda?: string;
  slogan?: string;
};

export default function CandidateList() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const hasRun=useRef(false);

  useEffect(() => {
    if (hasRun.current) return; // Prevent multiple fetches
    hasRun.current = true; // Set the flag to true after the first run
    const fetchCandidates = async () => {
      const loadToastId = toast.loading("Fetching candidates...");

      try {
        const response = await axios.get("/api/admin/getCandidates");
        setCandidates(response.data.candidates || []);
        showToast("Candidates loaded", "success", loadToastId);
      } catch (error) {
        console.error("Error fetching candidates from API:", error);
        showToast("Error fetching candidates", "error", loadToastId);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <SignHeader />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Candidate List
        </h1>

        <div className="flex flex-col space-y-4">
          {candidates.map((candidate, index) => (
            <div
              key={candidate.candidateId || index}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition"
            >
              <h2 className="text-xl font-semibold mb-2">{candidate.name}</h2>
              {candidate.party && (
                <p className="text-indigo-400 mb-1">Party: {candidate.party}</p>
              )}
              <p className="text-indigo-200 mb-4">
                "{candidate.agenda || candidate.slogan || 'No agenda provided'}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
