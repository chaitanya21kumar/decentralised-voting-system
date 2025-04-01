"use client"; // Mark as a client component to use state and file handling

import React, { useState } from "react";
import axios from "axios";

export default function UploadLists() {
  const [voterFile, setVoterFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "voter" | "candidate"
  ) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      if (type === "voter") {
        setVoterFile(selectedFile);
      } else {
        setCandidateFile(selectedFile);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!voterFile && !candidateFile) {
      setMessage("Please select at least one file to upload.");
      return;
    }

    const formData = new FormData();
    if (voterFile) {
      formData.append("voterFile", voterFile);
    }
    if (candidateFile) {
      formData.append("candidateFile", candidateFile);
    }

    try {
      const response = await axios.post("/api/admin/lists/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(response.data.message); // Show success message
    } catch (error) {
      console.error(error);
      setMessage("Error uploading files.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold text-center text-indigo-600 mb-6">
        Upload Voter and Candidate Lists
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Voter file upload */}
        <div>
          <label htmlFor="voterFile" className="block text-sm font-medium text-gray-700">
            Select Voter CSV File
          </label>
          <input
            id="voterFile"
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, "voter")}
            className="mt-2 block w-full text-sm text-gray-700 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Candidate file upload */}
        <div>
          <label htmlFor="candidateFile" className="block text-sm font-medium text-gray-700">
            Select Candidate CSV File
          </label>
          <input
            id="candidateFile"
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, "candidate")}
            className="mt-2 block w-full text-sm text-gray-700 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="btn w-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Upload Lists
        </button>
      </form>

      {/* Message display */}
      {message && (
        <div className={`mt-4 text-center text-sm ${message.includes("Error") ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
