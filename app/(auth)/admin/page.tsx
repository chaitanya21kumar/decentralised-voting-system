"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import SignHeader from "@/components/ui/signHeader";
import { showToast } from "../../../pages/api/admin/showToast";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // loader state
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true); // start loading

    console.log('Attempting admin login with:', { email, password: '*'.repeat(password.length) });

    try {
      const response = await axios.post("/api/admin/login", { email, password }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response:', response.status, response.data);
      
      if (response.status === 200) {
        showToast("Login successful!", "success");
        console.log('Redirecting to /admin/dashboard');
        router.push("/admin/dashboard");
      } else {
        showToast("Login failed. Please check your credentials.", "error");
      }
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        showToast("Unauthorized access. Please check your credentials.", "error");
      } else {
        showToast("Login failed. Try again.", "error");
      }
    } finally {
      setLoading(false); // stop loading
    }
  };

  return (
    <section>
      <SignHeader />
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
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-indigo-200/65" htmlFor="password">
                  Password
                </label>
                <Link className="text-sm text-gray-600 hover:underline" href="/reset-password">
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="form-input w-full"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {errorMessage && (
              <div className="mt-2 text-center text-sm text-red-600">{errorMessage}</div>
            )}

            {loading && (
              <div className="flex items-center justify-center space-x-2 text-indigo-400">
                <div className="w-5 h-5 border-4 border-indigo-500 border-dashed rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Logging in…</p>
              </div>
            )}

            <div className="mt-6 space-y-5">
              <button
                type="submit"
                className="btn w-full bg-gradient-to-t from-indigo-600 to-indigo-500 text-white hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
