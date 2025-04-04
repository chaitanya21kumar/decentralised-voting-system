"use client";
import React, { useState } from "react";
import axios from "axios";
import router from "next/router";

export default function UploadLists() {
  const [voterFile, setVoterFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "voter" | "candidate") => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (type === "voter") setVoterFile(selectedFile);
    else setCandidateFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!voterFile || !candidateFile) {
      setMessage("Please select both JSON files to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("voterFile", voterFile);
    formData.append("candidateFile", candidateFile);

    try {
      // 1. Upload to IPFS
      const uploadRes = await axios.post("/api/admin/lists/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const voterIpfsHash = uploadRes.data.data.voterFile.ipfsHash;
      const candidateIpfsHash = uploadRes.data.data.candidateFile.ipfsHash;

      // 2. Process Voters
      await axios.post("/api/admin/processVoters", { ipfsHash: voterIpfsHash });

      // 3. Process Candidates
      // await axios.post("/api/admin/processCandidates", { ipfsHash: candidateIpfsHash });

      setMessage("Upload and processing completed successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Error during upload or processing.");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("/api/admin/logout");
      router.push("/admin");
    } catch (error) {
      setMessage("Error logging out.");
    }
  };

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          <div className="pb-12 text-center">
            <h1 className="text-3xl font-semibold text-indigo-600">Upload Voter & Candidate JSON Files</h1>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto max-w-[400px] space-y-5">
            <div>
              <label className="block text-sm font-medium text-indigo-600">Select Voter JSON File</label>
              <input type="file" accept=".json" className="form-input w-full" onChange={(e) => handleFileChange(e, "voter")} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-600">Select Candidate JSON File</label>
              <input type="file" accept=".json" className="form-input w-full" onChange={(e) => handleFileChange(e, "candidate")} required />
            </div>

            {message && <div className="mt-2 text-center text-sm text-green-600">{message}</div>}

            <button type="submit" className="btn w-full bg-indigo-600 text-white hover:bg-indigo-700">
              Upload & Process Files
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn w-full bg-indigo-500 text-white hover:bg-indigo-700"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
