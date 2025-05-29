// components/ToastProvider.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";

export default function ToastProvider() {
  const pathname = usePathname();

  // Dismiss all toasts on route change
  useEffect(() => {
    toast.dismiss();
  }, [pathname]);

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1f2937", // gray-950
          color: "#e0e7ff", // indigo-100
          border: "1px solid #6366f1", // indigo-500
          padding: "14px 18px",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          backdropFilter: "blur(6px)",
        },
        success: {
          iconTheme: {
            primary: "#4f46e5", // indigo-600
            secondary: "#e0e7ff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffe4e6",
          },
        },
      }}
    />
  );
}
