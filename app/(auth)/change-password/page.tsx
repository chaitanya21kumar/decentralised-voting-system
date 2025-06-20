"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { showToast } from "../../../pages/api/admin/showToast";
import { Eye, EyeOff } from "lucide-react";

export default function ChangePassword() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [strength, setStrength] = useState<"weak" | "medium" | "strong" | "">("");

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastStrength = useRef<string>("");

  // Evaluate password strength allowing *any* non-alphanumeric as "special"
  const evaluateStrength = (password: string): "weak" | "medium" | "strong" | "" => {
    if (!password) return "";
    const strongRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    const mediumRegex = /^(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (strongRegex.test(password)) return "strong";
    if (mediumRegex.test(password)) return "medium";
    return "weak";
  };

  const getStrengthColor = () => {
    switch (strength) {
      case "weak":
        return "bg-red-500 w-1/3";
      case "medium":
        return "bg-yellow-500 w-2/3";
      case "strong":
        return "bg-green-500 w-full";
      default:
        return "bg-gray-700 w-0";
    }
  };

  // Require at least 8 chars, one uppercase, one lowercase, one digit, one special (non-alphanumeric)
  const validatePassword = (password: string) => {
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    return regex.test(password);
  };

  // Debounced strength check
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (!newPassword) {
      setStrength("");
      return;
    }
    debounceTimeout.current = setTimeout(() => {
      const current = evaluateStrength(newPassword);
      setStrength(current);
      if (current !== lastStrength.current) {
        lastStrength.current = current;
        if (current === "weak") showToast("Weak password", "error");
        else if (current === "medium") showToast("Medium strength password", "error");
        else if (current === "strong") showToast("Strong password 💪", "success");
      }
    }, 300);
  }, [newPassword]);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // clear previous errors

    const voterId = localStorage.getItem("voterId");
    if (!voterId) {
      showToast("No Voter ID found. Please log in again.", "error");
      return;
    }

    if (!validatePassword(newPassword)) {
      setError("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.post("/api/admin/change-password", { voterId, newPassword });
      localStorage.removeItem("voterId");
      showToast("Password updated successfully.", "success");
      router.push("/signinusers");
    } catch (err) {
      showToast("Error updating password. Please try again.", "error");
      console.error("Error updating password", err);
    }
  };

  const inputStyles =
    "w-full mb-2 text-black p-2 rounded pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <form onSubmit={handleChange} className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Change Your Password</h2>

        {/* New Password */}
        <div className="relative mb-2">
          <input
            type={showNew ? "text" : "password"}
            className={inputStyles}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError("");
            }}
            required
          />
          <button
            type="button"
            className="absolute top-2 right-3 text-gray-600 hover:text-white"
            onClick={() => setShowNew(!showNew)}
          >
            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Strength Bar */}
        <div className="h-2 bg-gray-700 rounded mb-2 overflow-hidden">
          <div className={`h-full ${getStrengthColor()} transition-all duration-300`} />
        </div>

        {/* Confirm Password */}
        <div className="relative mb-2">
          <input
            type={showConfirm ? "text" : "password"}
            className={inputStyles}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            required
          />
          <button
            type="button"
            className="absolute top-2 right-3 text-gray-600 hover:text-white"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Match Indicator */}
        {confirmPassword.length > 0 && (
          <p className={`text-sm mb-2 ${newPassword === confirmPassword ? "text-green-400" : "text-red-400"}`}>
            {newPassword === confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
          </p>
        )}

        <p className="text-sm text-gray-400 mb-3">
          Must be at least 8 characters and include uppercase, lowercase, number, and special character.
        </p>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded transition">
          Update Password
        </button>
      </form>
    </section>
  );
}
