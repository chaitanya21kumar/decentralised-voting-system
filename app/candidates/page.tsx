"use client";
import React, { useState } from "react";

export default function CandidateList() {
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

  const [showForm, setShowForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    slogan: "",
  });

  const addCandidate = () => {
    const candidate = {
      candidateId: candidates.length + 1,
      name: newCandidate.name,
      slogan: newCandidate.slogan,
      votes: 0,
    };

    setCandidates([...candidates, candidate]);
    setNewCandidate({ name: "", slogan: "" });
    setShowForm(false);
  };

  return (
    <section className="bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
          Candidate List
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div
              key={candidate.candidateId}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition"
            >
              <h2 className="text-xl font-semibold mb-2">{candidate.name}</h2>
              <p className="text-indigo-200 mb-4">"{candidate.slogan}"</p>
              <div className="flex justify-between items-center">
                <span className="text-sm">
                  Current Votes: {candidate.votes}
                </span>
                <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">
                  Vote
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Candidate"}
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-lg w-96">
              <h3 className="text-2xl mb-4">Add New Candidate</h3>
              <input
                type="text"
                placeholder="Candidate Name"
                value={newCandidate.name}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, name: e.target.value })
                }
                className="w-full mb-4 p-2 bg-gray-700 rounded"
              />
              <input
                type="text"
                placeholder="Candidate Slogan"
                value={newCandidate.slogan}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, slogan: e.target.value })
                }
                className="w-full mb-4 p-2 bg-gray-700 rounded"
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={addCandidate}
                  className="bg-indigo-600 text-white px-4 py-2 rounded"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
