"use client"; // Mark as a client component to use state and file handling

import React, { useState } from "react";
import { useRouter } from "next/navigation"; // Use next/navigation for router
import axios from "axios";

// Removed metadata export from client component

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter(); // Using useRouter from next/navigation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await axios.post("/api/admin/login", { email, password });
      
      if (response.data.success) {
        router.push("/admin/voter-upload"); // Redirect to the voter upload page
      } else {
        setErrorMessage("Invalid email or password");
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      setErrorMessage("An error occurred while signing in.");
    }
  };

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          <div className="pb-12 text-center">
            <h1 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,theme(colors.gray.200),theme(colors.indigo.200),theme(colors.gray.50),theme(colors.indigo.300),theme(colors.gray.200))] bg-[length:200%_auto] bg-clip-text font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              Admin Sign In
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="mx-auto max-w-[400px] space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-indigo-200/65" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input w-full"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-indigo-200/65" htmlFor="password">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                className="form-input w-full"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {errorMessage && (
              <div className="mt-2 text-center text-sm text-red-600">
                {errorMessage}
              </div>
            )}
            <div className="mt-6 space-y-5">
              <button className="btn w-full bg-gradient-to-t from-indigo-600 to-indigo-500 text-white hover:bg-indigo-700">
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
