"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new dashboard
    router.push("/admin_page/dashboard");
  }, [router]);

  return (
    <div className="bg-gray-950 text-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-dashed rounded-full animate-spin mx-auto mb-4" />
        <p>Redirecting to Admin Dashboard...</p>
      </div>
    </div>
  );
}
