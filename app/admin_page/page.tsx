"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

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
    if (!voterFile || !candidateFile) {
      setMessage("Please select both JSON files to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("voterFile", voterFile);
    formData.append("candidateFile", candidateFile);

    try {
      const response = await axios.post("/api/admin/lists/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setMessage(`Upload Successful! Voter IPFS: ${response.data.data.voterFile.ipfsHash}, Candidate IPFS: ${response.data.data.candidateFile.ipfsHash}`);
      } else {
        setMessage("Upload failed.");
      }
    } catch (error) {
      setMessage("Error uploading files.");
    }
  };
 
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await axios.post("/api/admin/logout");
      console.log("Logout successful");
      router.push("/admin");
    } catch (error) {
      console.log("Error logging out:", error); 
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

            <button type="submit" className="btn w-full bg-indigo-600 text-white hover:bg-indigo-700">Upload Files</button>
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

