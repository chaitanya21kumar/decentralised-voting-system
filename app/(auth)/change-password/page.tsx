"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { showToast } from "../../../pages/api/admin/showToast";

export default function ChangePassword() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const voterId = localStorage.getItem("voterId");

    if (!voterId) {
      showToast("No Voter ID found. Please log in again.", "error"); 
      return;
    }

    try {
      await axios.post("/api/admin/change-password", {
        voterId,
        newPassword,
      });
      localStorage.removeItem("voterId");
      showToast("Password updated successfully. Please log in again.", "success"); 
      router.push("/");
    } catch (error) {
      showToast("Error updating password. Please try again.", "error"); 
      console.error("Error updating password", error);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleChange} className="bg-gray-800 p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Change Your Password</h2>
        <input
          type="password"
          className="form-input w-full mb-4"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn w-full bg-indigo-600 hover:bg-indigo-700">
          Update Password
        </button>
      </form>
    </section>
  );
}
