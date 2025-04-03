"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function UploadLists() {
  const [voterFile, setVoterFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "voter" | "candidate") => {
    if (type === "voter") {
      setVoterFile(e.target.files ? e.target.files[0] : null);
    } else {
      setCandidateFile(e.target.files ? e.target.files[0] : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterFile || !candidateFile) {
      setMessage("Please select both voter and candidate files to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("voterFile", voterFile);
    formData.append("candidateFile", candidateFile);

    try {
      const response = await axios.post("/api/admin/lists/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Error uploading files.");
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
          {/* Section Header */}
          <div className="pb-12 text-center">
            <h1 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,theme(colors.gray.200),theme(colors.indigo.200),theme(colors.gray.50),theme(colors.indigo.300),theme(colors.gray.200))] bg-[length:200%_auto] bg-clip-text font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              Upload Voter & Candidate Lists
            </h1>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="mx-auto max-w-[400px] space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-indigo-200/65">
                Select Voter CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                className="form-input w-full cursor-pointer border border-gray-300 rounded-lg p-2 text-gray-700"
                onChange={(e) => handleFileChange(e, "voter")}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-indigo-200/65">
                Select Candidate CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                className="form-input w-full cursor-pointer border border-gray-300 rounded-lg p-2 text-gray-700"
                onChange={(e) => handleFileChange(e, "candidate")}
                required
              />
            </div>

            {message && (
              <div className={`mt-2 text-center text-sm ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                {message}
              </div>
            )}

            <div className="mt-6 space-y-5">
              <button
                type="submit"
                className="btn w-full bg-gradient-to-t from-indigo-600 to-indigo-500 text-white hover:bg-indigo-700"
              >
                Upload Lists
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn w-full bg-indigo-500 text-white hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
