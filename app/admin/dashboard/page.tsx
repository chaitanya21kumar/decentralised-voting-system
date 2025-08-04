// app/admin/dashboard/page.tsx
"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminHeader from "@/components/ui/AdminHeader";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import ToastProvider from "@/components/ui/ToastProvider";

/* ---------- typed shape that /api/admin/stats returns ---------- */
type CandidateStat = { name: string; votes: number };

interface StatData {
  totalVoters: number;
  votesCast: number;
  candidateStats: CandidateStat[];
  isVotingOpen: boolean;
}

interface StatResponse {
  success: boolean;
  data: StatData;
}

/* ---------------- simple fetcher for SWR ---------------- */
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json() as Promise<StatResponse>);

/* ---------------- tiny stat-card component ---------------- */
function StatCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800">{value}</p>
    </div>
  );
}

/* --------------------- page component -------------------- */
export default function AdminDashboardPage() {
  const router = useRouter();

  /* ---- hit the stats endpoint every 30 s ---- */
  const { data, error, isLoading } = useSWR<StatResponse>(
    "/api/admin/stats",
    fetcher,
    { refreshInterval: 30_000 }
  );

  /* ---- very naive auth-guard: if API says 401, kick to login ---- */
  useEffect(() => {
    if ((error as any)?.status === 401) router.replace("/admin");
  }, [error, router]);

  if (isLoading) return <FullScreenLoader />;

  if (error || !data?.success) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <p className="text-red-600">Failed to load stats.</p>
        <button
          onClick={() => router.refresh()}
          className="rounded bg-blue-600 px-4 py-1 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = data.data;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 pb-8">
        <AdminHeader />
        <main className="mx-auto mt-8 w-full max-w-5xl px-4">
          {/* --- stat cards grid --- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <StatCard label="Total Voters" value={stats.totalVoters} />
            <StatCard label="Votes Cast" value={stats.votesCast} />
            <StatCard
              label="Participation %"
              value={
                stats.totalVoters
                  ? ((stats.votesCast / stats.totalVoters) * 100).toFixed(1) + "%"
                  : "—"
              }
            />
            <StatCard
              label="Voting Status"
              value={
                <span
                  className={
                    "rounded px-2 py-0.5 text-sm font-medium " +
                    (stats.isVotingOpen
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700")
                  }
                >
                  {stats.isVotingOpen ? "OPEN" : "CLOSED"}
                </span>
              }
            />
          </div>

          {/* --- placeholder for charts (Phase 4) --- */}
          <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
            Charts coming next…
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
