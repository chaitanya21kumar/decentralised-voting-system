"use client";
import React from "react";
import { Loader2 } from "lucide-react";

export default function FullScreenLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
      <p className="text-white text-lg">{message || "Loading..."}</p>
    </div>
  );
}
