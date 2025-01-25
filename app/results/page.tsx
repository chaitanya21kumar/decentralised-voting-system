"use client"
import React, { useState } from "react";

export default function ResultsPage() {
  const [candidates, setCandidates] = useState([
    {
      candidateId: 1,
      name: "John Smith",
      slogan: "Progress Through Unity",
      votes: 450,
    },
    {
      candidateId: 2,
      name: "Emily Rodriguez",
      slogan: "Innovation for All",
      votes: 380,
    },
    {
      candidateId: 3,
      name: "Michael Chang",
      slogan: "Building a Stronger Future",
      votes: 320,
    },
  ]);

  // Sort candidates by votes in descending order
  const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);
  const totalVotes = candidates.reduce(
    (sum, candidate) => sum + candidate.votes,
    0
  );

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Election Results
        </h1>

        {/* Winner Highlight */}
        <div className="max-w-xl mx-auto bg-gray-800 rounded-lg p-6 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Winner</h2>
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 p-4 rounded-lg">
            <h3 className="text-xl font-semibold">
              {sortedCandidates[0].name}
            </h3>
            <p className="text-white/80">{sortedCandidates[0].slogan}</p>
            <p className="text-lg mt-2">Votes: {sortedCandidates[0].votes}</p>
          </div>
        </div>

        {/* Full Results */}
        <div className="grid md:grid-cols-3 gap-6">
          {sortedCandidates.map((candidate, index) => (
            <div
              key={candidate.candidateId}
              className={`
                bg-gray-800 rounded-lg p-6
                ${index === 0 ? "border-4 border-indigo-600" : ""}
              `}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{candidate.name}</h2>
                <span className="text-lg font-bold text-indigo-400">
                  {((candidate.votes / totalVotes) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                <div
                  className="bg-indigo-600 h-4 rounded-full"
                  style={{ width: `${(candidate.votes / totalVotes) * 100}%` }}
                />
              </div>
              <p className="text-indigo-200">{candidate.votes} Total Votes</p>
            </div>
          ))}
        </div>

        {/* Total Votes */}
        <div className="text-center mt-8">
          <p className="text-xl">
            Total Votes Cast:{" "}
            <span className="font-bold text-indigo-400">{totalVotes}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
