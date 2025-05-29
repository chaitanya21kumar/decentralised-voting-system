"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/ui/AdminHeader";
import { showToast } from "../../pages/api/admin/showToast";

export default function UploadLists() {
  const router = useRouter();
  const [voterFile, setVoterFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // loader state

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "voter" | "candidate") => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (type === "voter") setVoterFile(selectedFile);
    else setCandidateFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!voterFile || !candidateFile) {
      showToast("Please select both JSON files to upload.", "error");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("voterFile", voterFile);
    formData.append("candidateFile", candidateFile);

    try {
      const uploadRes = await axios.post("/api/admin/lists/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Files uploaded successfully!", "success");

      const voterIpfsHash = uploadRes.data.data.voterFile.ipfsHash;
      const candidateIpfsHash = uploadRes.data.data.candidateFile.ipfsHash;

      await axios.post("/api/admin/processVoters", { ipfsHash: voterIpfsHash });
      await axios.post("/api/admin/processCandidates", { ipfsHash: candidateIpfsHash });

      showToast("Voter and Candidate files processed successfully!", "success");
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push("/admin");
        showToast("Session expired. Please log in again.", "error");
        return;
      }
      console.error("Upload error:", error);
      showToast("Error during upload or processing.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <AdminHeader />
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

            {loading && (
              <div className="flex items-center space-x-2 justify-center text-indigo-400">
                <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin" />
                <p className="text-sm font-medium">Processing files, please wait...</p>
              </div>
            )}

            {message && !loading && (
              <div className="mt-2 text-center text-sm text-green-600">{message}</div>
            )}

            <button
              type="submit"
              className="btn w-full bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? "Uploading..." : "Upload & Process Files"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
