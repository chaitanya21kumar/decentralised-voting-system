"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Web3 from "web3";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import type { LegendOptions } from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import AdminHeader from "@/components/ui/AdminHeader";
import { votingAbi, votingAddress } from "../../artifacts/votingArtifact";
import { showToast } from "../../../pages/api/admin/showToast";
import { ElectionControlPanel } from "../../../components/admin/ElectionControlPanel";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  ArcElement,
  PointElement,
  LineElement
);

interface DashboardStats {
  totalVoters: number;
  totalCandidates: number;
  votescast: number;
  electionStatus: "not_started" | "running" | "ended";
  timeLeft: number;
  votingStart: number;
  votingEnd: number;
  verifiedVoters: number;
  recentRegistrations: Array<{
    name: string;
    rollNumber: string;
    registeredAt: string;
  }>;
  electionDetails?: {
    adminName: string;
    adminEmail: string;
    electionTitle: string;
    organizationTitle: string;
    maxVotesPerCandidate: number;
  };
}

interface CandidateVotes {
  id: number;
  name: string;
  slogan: string;
  votes: number;
  percentage: number;
}

interface ContractEvent {
  event: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  returnValues: any;
}

function formatSecondsToHHMMSS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVoters: 0,
    totalCandidates: 0,
    votescast: 0,
    electionStatus: "not_started",
    timeLeft: 0,
    votingStart: 0,
    votingEnd: 0,
    verifiedVoters: 0,
    recentRegistrations: [],
  });
  const [candidateVotes, setCandidateVotes] = useState<CandidateVotes[]>([]);
  const [recentEvents, setRecentEvents] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [contractConnected, setContractConnected] = useState(false);
  const hasRun = useRef(false);

  const fetchBlockchainData = async () => {
    try {
      const web3 = new Web3("http://127.0.0.1:8545");
      const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
      
      // Check if contract is accessible
      const superAdmin = await voting.methods.superAdmin().call();
      setContractConnected(true);

      // Get basic contract data
      const [
        candidateCount,
        voterCount,
        votingStart,
        votingEnd,
        detailsSet,
        isPaused
      ] = await Promise.all([
        voting.methods.getCandidateCount().call(),
        voting.methods.voterCount().call(),
        voting.methods.votingStart().call(),
        voting.methods.votingEnd().call(),
        voting.methods.detailsSet().call(),
        voting.methods.isPaused().call(),
      ]);

      // Get election details if set
      let electionDetails = undefined;
      if (detailsSet) {
        try {
          const details = await voting.methods.election().call();
          electionDetails = {
            adminName: details.adminName,
            adminEmail: details.adminEmail,
            electionTitle: details.electionTitle,
            organizationTitle: details.organizationTitle,
            maxVotesPerCandidate: Number(details.maxVotesPerCandidate),
          };
        } catch (err) {
          console.warn("Could not fetch election details:", err);
        }
      }

      // Calculate election status and time left
      const currentTime = Date.now() / 1000;
      const startTime = Number(votingStart);
      const endTime = Number(votingEnd);
      
      let electionStatus: "not_started" | "running" | "ended" = "not_started";
      let timeLeft = 0;

      if (startTime > 0) {
        if (currentTime < startTime) {
          electionStatus = "not_started";
          timeLeft = startTime - currentTime;
        } else if (currentTime >= startTime && currentTime <= endTime) {
          electionStatus = "running";
          timeLeft = endTime - currentTime;
        } else {
          electionStatus = "ended";
          timeLeft = 0;
        }
      }

      // Get candidate data and votes
      const candidatesData: CandidateVotes[] = [];
      let totalVotes = 0;

      for (let i = 0; i < Number(candidateCount); i++) {
        try {
          const candidate = await voting.methods.candidates(i).call();
          const votes = Number(candidate.votes);
          totalVotes += votes;
          
          candidatesData.push({
            id: Number(candidate.id),
            name: candidate.name,
            slogan: candidate.slogan,
            votes,
            percentage: 0, // Will calculate after getting total
          });
        } catch (err) {
          console.warn(`Could not fetch candidate ${i}:`, err);
        }
      }

      // Calculate percentages
      const candidatesWithPercentage = candidatesData.map(c => ({
        ...c,
        percentage: totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0,
      }));

      setCandidateVotes(candidatesWithPercentage);

      return {
        totalCandidates: Number(candidateCount),
        votescast: totalVotes,
        electionStatus,
        timeLeft: Math.max(0, timeLeft),
        votingStart: startTime,
        votingEnd: endTime,
        electionDetails,
        isPaused,
        superAdmin,
      };

    } catch (error) {
      console.error("Blockchain connection error:", error);
      setContractConnected(false);
      throw error;
    }
  };

  const fetchDatabaseData = async () => {
    try {
      const [votersRes] = await Promise.all([
        axios.get("/api/admin/dashboard/voters"),
      ]);

      return {
        totalVoters: votersRes.data.totalVoters || 0,
        verifiedVoters: votersRes.data.verifiedVoters || 0,
        recentRegistrations: votersRes.data.recentRegistrations || [],
      };
    } catch (error) {
      console.error("Database fetch error:", error);
      return {
        totalVoters: 0,
        verifiedVoters: 0,
        recentRegistrations: [],
      };
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const web3 = new Web3("http://127.0.0.1:8545");
      const voting = new web3.eth.Contract(votingAbi as any, votingAddress);
      
      const latestBlock = await web3.eth.getBlockNumber();
      const fromBlock = Math.max(0, Number(latestBlock) - 1000);

      // Get recent events
      const events = await voting.getPastEvents("allEvents", {
        fromBlock,
        toBlock: "latest"
      });

      // Process and format events
      const processedEvents: ContractEvent[] = [];
      
      for (const event of events.slice(-20)) { // Get last 20 events
        try {
          const block = await web3.eth.getBlock(event.blockNumber);
          processedEvents.push({
            event: event.event,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
            returnValues: event.returnValues,
          });
        } catch (err) {
          console.warn("Error processing event:", err);
        }
      }

      // Sort by block number (newest first)
      processedEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setRecentEvents(processedEvents);

    } catch (error) {
      console.error("Error fetching events:", error);
      setRecentEvents([]);
    }
  };

  const fetchAllData = async () => {
    try {
      // Fetch blockchain and database data in parallel
      const [blockchainData, databaseData] = await Promise.all([
        fetchBlockchainData(),
        fetchDatabaseData(),
      ]);

      // Combine the data
      setStats({
        ...stats,
        ...blockchainData,
        ...databaseData,
      });

      // Fetch events separately (non-critical)
      await fetchRecentEvents();

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showToast("Error loading dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    fetchAllData();
  }, []);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Real-time timer for election countdown
  useEffect(() => {
    if (stats.electionStatus !== "running") return;

    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [stats.electionStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started": return "text-yellow-400";
      case "running": return "text-green-400";
      case "ended": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "not_started": return "Not Started";
      case "running": return "Running";
      case "ended": return "Ended";
      default: return "Unknown";
    }
  };

  const getEventIcon = (eventName: string) => {
    switch (eventName) {
      case "VoterRegistered": return "👤";
      case "VoterVerified": return "✅";
      case "VoteCast": return "🗳️";
      case "CandidateAdded": return "📝";
      case "ElectionStarted": return "🚀";
      case "ElectionEnded": return "🏁";
      case "WinnerDeclared": return "🏆";
      default: return "📋";
    }
  };

  const getEventDescription = (event: ContractEvent) => {
    switch (event.event) {
      case "VoterRegistered":
        return `${event.returnValues.name || "Voter"} registered`;
      case "VoterVerified":
        return `Voter verified: ${event.returnValues.voter}`;
      case "VoteCast":
        return `Vote cast for candidate ${event.returnValues.candidateId}`;
      case "CandidateAdded":
        return `Candidate added: ${event.returnValues.name}`;
      case "ElectionStarted":
        return "Election started";
      case "ElectionEnded":
        return "Election ended";
      case "WinnerDeclared":
        return `Winner: ${event.returnValues.winnerName} (${event.returnValues.maxVotes} votes)`;
      default:
        return `${event.event} event`;
    }
  };

  // Chart data preparation
  const voteChartData = {
    labels: candidateVotes.map(c => c.name),
    datasets: [
      {
        label: "Votes",
        data: candidateVotes.map(c => c.votes),
        backgroundColor: [
          "#6366f1",
          "#8b5cf6",
          "#ec4899",
          "#f59e0b",
          "#10b981",
          "#ef4444",
        ],
        borderColor: "#374151",
        borderWidth: 2,
      },
    ],
  };

  const pieChartData = {
    labels: candidateVotes.map(c => c.name),
    datasets: [
      {
        data: candidateVotes.map(c => c.votes),
        backgroundColor: [
          "#6366f1",
          "#8b5cf6",
          "#ec4899",
          "#f59e0b",
          "#10b981",
          "#ef4444",
        ],
      },
    ],
  };

  if (loading) {
    return (
      <section className="bg-gray-950 text-white min-h-screen">
        <AdminHeader />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
            <p className="ml-4 text-indigo-300">Loading dashboard...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-200">
              Admin Dashboard
            </h1>
            {stats.electionDetails && (
              <p className="text-gray-400 mt-2">{stats.electionDetails.electionTitle}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${contractConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${contractConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{contractConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              onClick={fetchAllData}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
            >
              Refresh
            </button>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-sm font-medium text-indigo-400">Total Voters</h3>
            <p className="text-2xl font-bold text-white">{stats.totalVoters}</p>
            <p className="text-xs text-gray-400">Registered</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-sm font-medium text-green-400">Verified Voters</h3>
            <p className="text-2xl font-bold text-white">{stats.verifiedVoters}</p>
            <p className="text-xs text-gray-400">
              {stats.totalVoters > 0 ? `${((stats.verifiedVoters / stats.totalVoters) * 100).toFixed(1)}%` : '0%'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-sm font-medium text-purple-400">Candidates</h3>
            <p className="text-2xl font-bold text-white">{stats.totalCandidates}</p>
            <p className="text-xs text-gray-400">Registered</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-sm font-medium text-yellow-400">Votes Cast</h3>
            <p className="text-2xl font-bold text-white">{stats.votescast}</p>
            <p className="text-xs text-gray-400">
              {stats.verifiedVoters > 0 ? 
                `${((stats.votescast / stats.verifiedVoters) * 100).toFixed(1)}% turnout` : 
                "No turnout data"
              }
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-sm font-medium text-indigo-400">Election Status</h3>
            <p className={`text-xl font-bold ${getStatusColor(stats.electionStatus)}`}>
              {getStatusText(stats.electionStatus)}
            </p>
            {stats.electionStatus === "running" && (
              <p className="text-xs text-gray-400">
                {formatSecondsToHHMMSS(stats.timeLeft)} left
              </p>
            )}
          </motion.div>
        </div>

        {/* Election Control Panel */}
        <ElectionControlPanel 
          electionStatus={stats.electionStatus}
          detailsSet={stats.electionDetails !== undefined}
          onUpdate={fetchAllData}
        />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Vote Distribution Bar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">Vote Distribution</h3>
            {candidateVotes.length > 0 ? (
              <div className="h-64">
                <Bar
                  data={voteChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: "#9ca3af" },
                        grid: { color: "#374151" },
                      },
                      x: {
                        ticks: { color: "#9ca3af" },
                        grid: { color: "#374151" },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No vote data available
              </div>
            )}
          </motion.div>

          {/* Vote Share Pie Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">Vote Share</h3>
            {candidateVotes.length > 0 && stats.votescast > 0 ? (
              <div className="h-64">
                <Pie
                  data={pieChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { color: "#9ca3af" },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No vote data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Activity and Registrations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Blockchain Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">
              Recent Blockchain Events
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentEvents.length > 0 ? (
                recentEvents.map((event, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                    <div className="text-lg">{getEventIcon(event.event)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{getEventDescription(event)}</p>
                      <p className="text-xs text-gray-400">
                        Block #{event.blockNumber} • {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {event.transactionHash.slice(0, 10)}...{event.transactionHash.slice(-8)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent events</p>
              )}
            </div>
          </motion.div>

          {/* Recent Registrations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">
              Recent Voter Registrations
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.recentRegistrations.length > 0 ? (
                stats.recentRegistrations.map((reg, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <p className="font-medium">{reg.name}</p>
                      <p className="text-sm text-gray-400">Roll: {reg.rollNumber}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(reg.registeredAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent registrations</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Candidate Details */}
        {candidateVotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">Candidate Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidateVotes.map((candidate) => (
                <div key={candidate.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{candidate.name}</h4>
                    <span className="text-sm bg-indigo-600 px-2 py-1 rounded">
                      {candidate.votes} votes
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">"{candidate.slogan}"</p>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${candidate.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{candidate.percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}