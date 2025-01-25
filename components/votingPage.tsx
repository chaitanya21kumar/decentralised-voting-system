import React, { useState } from "react";

export default function VotingPage() {
  const [candidates, setCandidates] = useState([
    {
      candidateId: 1,
      name: "John Smith",
      slogan: "Progress Through Unity",
      votes: 0,
    },
    {
      candidateId: 2,
      name: "Emily Rodriguez",
      slogan: "Innovation for All",
      votes: 0,
    },
    {
      candidateId: 3,
      name: "Michael Chang",
      slogan: "Building a Stronger Future",
      votes: 0,
    },
  ]);

  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [voterDetails, setVoterDetails] = useState({
    name: "",
    phone: "",
  });

  const handleVote = () => {
    if (selectedCandidate) {
      // In a real implementation, this would interact with the smart contract
      const updatedCandidates = candidates.map((candidate) =>
        candidate.candidateId === selectedCandidate
          ? { ...candidate, votes: candidate.votes + 1 }
          : candidate
      );
      setCandidates(updatedCandidates);
      setSelectedCandidate(null);
    }
  };

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Cast Your Vote
        </h1>

        {/* Voter Registration */}
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Voter Registration</h2>
          <input
            type="text"
            placeholder="Your Name"
            value={voterDetails.name}
            onChange={(e) =>
              setVoterDetails({ ...voterDetails, name: e.target.value })
            }
            className="w-full mb-4 p-2 bg-gray-700 rounded"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={voterDetails.phone}
            onChange={(e) =>
              setVoterDetails({ ...voterDetails, phone: e.target.value })
            }
            className="w-full mb-4 p-2 bg-gray-700 rounded"
          />
          <button className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
            Register Voter
          </button>
        </div>

        {/* Candidate Selection */}
        <div className="grid md:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div
              key={candidate.candidateId}
              onClick={() => setSelectedCandidate(candidate.candidateId)}
              className={`
                bg-gray-800 rounded-lg p-6 cursor-pointer transition
                ${
                  selectedCandidate === candidate.candidateId
                    ? "border-4 border-indigo-600"
                    : "hover:bg-gray-700"
                }
              `}
            >
              <h2 className="text-xl font-semibold mb-2">{candidate.name}</h2>
              <p className="text-indigo-200 mb-4">"{candidate.slogan}"</p>
            </div>
          ))}
        </div>

        {/* Vote Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleVote}
            disabled={!selectedCandidate}
            className={`
              px-6 py-3 rounded text-white
              ${
                selectedCandidate
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-600 cursor-not-allowed"
              }
            `}
          >
            Submit Vote
          </button>
        </div>
      </div>
    </section>
  );
}
