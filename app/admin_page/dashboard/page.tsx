"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/ui/AdminHeader";
import AdminNavigation from "@/components/ui/AdminNavigation";
import { showToast } from "../../../pages/api/admin/showToast";
import Web3 from "web3";
import { votingAbi, votingAddress } from "../../artifacts/votingArtifact.js";

interface ElectionStats {
  candidateCount: number;
  voterCount: number;
  totalVotesCast: number;
  votingStart: number;
  votingEnd: number;
  detailsSet: boolean;
  isPaused: boolean;
}

interface Candidate {
  id: number;
  name: string;
  slogan: string;
  votes: number;
}

interface Voter {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  phoneNumber: string;
  mustChangePassword: boolean;
  createdAt?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [electionStats, setElectionStats] = useState<ElectionStats>({
    candidateCount: 0,
    voterCount: 0,
    totalVotesCast: 0,
    votingStart: 0,
    votingEnd: 0,
    detailsSet: false,
    isPaused: false,
  });
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [voterFile, setVoterFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  
  // Election setup form
  const [electionForm, setElectionForm] = useState({
    adminName: "",
    adminEmail: "",
    adminTitle: "",
    electionTitle: "",
    organizationTitle: "",
    maxVotes: 1,
    durationMinutes: 10,
  });

  // New admin form
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    password: "",
    name: "",
  });

  useEffect(() => {
    setMounted(true);
    setLastRefresh(new Date());
    fetchElectionStats();
    fetchCandidates();
    fetchVoters();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (activeTab === "overview") {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Manual refresh function
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchElectionStats(),
        fetchCandidates(), 
        fetchVoters()
      ]);
      setLastRefresh(new Date());
      showToast("Data refreshed successfully", "success");
    } catch (error) {
      showToast("Failed to refresh data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const getWeb3Contract = async () => {
    const web3 = new Web3(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");
    const contract = new web3.eth.Contract(votingAbi as any, votingAddress);
    const accounts = await web3.eth.getAccounts();
    return { contract, admin: accounts[0] };
  };

  const fetchElectionStats = async () => {
    try {
      const { contract } = await getWeb3Contract();
      const [
        candidateCount,
        voterCount,
        totalVotesCast,
        votingStart,
        votingEnd,
        detailsSet,
        isPaused,
      ] = await Promise.all([
        contract.methods.candidateCount().call(),
        contract.methods.voterCount().call(),
        contract.methods.totalVotesCast().call(),
        contract.methods.votingStart().call(),
        contract.methods.votingEnd().call(),
        contract.methods.detailsSet().call(),
        contract.methods.isPaused().call(),
      ]);

      setElectionStats({
        candidateCount: Number(candidateCount),
        voterCount: Number(voterCount),
        totalVotesCast: Number(totalVotesCast),
        votingStart: Number(votingStart),
        votingEnd: Number(votingEnd),
        detailsSet,
        isPaused,
      });
    } catch (error) {
      console.error("Error fetching election stats:", error);
    }
  };

  const fetchCandidates = async () => {
    try {
      // Get candidates from database
      const res = await axios.get("/api/admin/getCandidates");
      if (res.data.success) {
        const dbCandidates = res.data.candidates;
        
        // Get vote counts from blockchain
        try {
          const { contract } = await getWeb3Contract();
          const candidateCount = Number(await contract.methods.candidateCount().call());
          
          const candidatesWithVotes = await Promise.all(
            dbCandidates.map(async (c: any, i: number) => {
              let votes = 0;
              if (i < candidateCount) {
                try {
                  const candidate = await contract.methods.candidates(i).call();
                  votes = Number(candidate.votes);
                } catch (error) {
                  console.error(`Error fetching votes for candidate ${i}:`, error);
                }
              }
              return {
                id: i,
                name: c.name,
                slogan: c.agenda || c.slogan || "",
                votes: votes,
              };
            })
          );
          
          setCandidates(candidatesWithVotes);
        } catch (blockchainError) {
          console.error("Error fetching votes from blockchain:", blockchainError);
          // Fallback to database data without vote counts
          setCandidates(dbCandidates.map((c: any, i: number) => ({
            id: i,
            name: c.name,
            slogan: c.agenda || c.slogan || "",
            votes: 0,
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  const fetchVoters = async () => {
    try {
      const res = await axios.get("/api/admin/getVoters");
      if (res.data.success) {
        setVoters(res.data.voters);
      }
    } catch (error) {
      console.error("Error fetching voters:", error);
    }
  };

  const handleFileUpload = async () => {
    if (!voterFile || !candidateFile) {
      showToast("Please select both JSON files to upload.", "error");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("voterFile", voterFile);
    formData.append("candidateFile", candidateFile);

    try {
      const uploadRes = await axios.post("/api/admin/lists/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Files uploaded successfully!", "success");

      const voterIpfsHash = uploadRes.data.data.voterFile.ipfsHash;
      const candidateIpfsHash = uploadRes.data.data.candidateFile.ipfsHash;

      await axios.post("/api/admin/processVoters", { ipfsHash: voterIpfsHash });
      await axios.post("/api/admin/processCandidates", { ipfsHash: candidateIpfsHash });

      showToast("Voter and Candidate files processed successfully!", "success");
      fetchElectionStats();
      fetchCandidates();
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push("/admin");
        showToast("Session expired. Please log in again.", "error");
        return;
      }
      showToast("Error during upload or processing.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSetElectionDetails = async () => {
    try {
      // Validate form data
      if (!electionForm.adminName.trim() || !electionForm.adminEmail.trim() || 
          !electionForm.electionTitle.trim() || !electionForm.organizationTitle.trim()) {
        showToast("Please fill in all required fields.", "error");
        return;
      }
      
      if (electionForm.maxVotes < 1) {
        showToast("Max votes must be at least 1.", "error");
        return;
      }
      
      const { contract, admin } = await getWeb3Contract();
      await contract.methods
        .setElectionDetails(
          electionForm.adminName,
          electionForm.adminEmail,
          electionForm.adminTitle,
          electionForm.electionTitle,
          electionForm.organizationTitle,
          electionForm.maxVotes
        )
        .send({ from: admin, gas: 1000000 });
      
      showToast("Election details set successfully!", "success");
      fetchElectionStats();
    } catch (error: any) {
      console.error("Set election details error:", error);
      showToast(`Error setting election details: ${error.message || 'Unknown error'}`, "error");
    }
  };

  const handleStartElection = async () => {
    try {
      const { contract, admin } = await getWeb3Contract();
      
      // Validate form data
      if (!electionForm.electionTitle.trim()) {
        showToast("Please provide an election title.", "error");
        return;
      }
      
      if (electionForm.durationMinutes < 1) {
        showToast("Duration must be at least 1 minute.", "error");
        return;
      }
      
      await contract.methods
        .startElection(electionForm.durationMinutes)
        .send({ from: admin, gas: 1000000 });
      
      showToast("Election started successfully!", "success");
      fetchElectionStats();
    } catch (error: any) {
      console.error("Start election error:", error);
      showToast(`Error starting election: ${error.message || 'Unknown error'}`, "error");
    }
  };

  const handleEndElection = async () => {
    try {
      const { contract, admin } = await getWeb3Contract();
      
      // Check if election is active first
      const votingStart = Number(await contract.methods.votingStart().call());
      if (votingStart === 0) {
        showToast("No active election to end.", "error");
        return;
      }
      
      await contract.methods.endElection().send({ from: admin, gas: 1000000 });
      
      showToast("Election ended successfully!", "success");
      fetchElectionStats();
    } catch (error: any) {
      console.error("End election error:", error);
      showToast(`Error ending election: ${error.message || 'Unknown error'}`, "error");
    }
  };

  const handleResetElection = async () => {
    try {
      const { contract, admin } = await getWeb3Contract();
      
      // Check if election can be reset (should match contract logic)
      const votingStart = Number(await contract.methods.votingStart().call());
      const votingEnd = Number(await contract.methods.votingEnd().call());
      const now = Math.floor(Date.now() / 1000);
      
      // Contract allows reset if: votingStart == 0 OR (votingEnd != 0 && now > votingEnd)
      if (votingStart !== 0 && (votingEnd === 0 || now <= votingEnd)) {
        showToast("Cannot reset active election. Please end it first.", "error");
        return;
      }
      
      await contract.methods.resetElection().send({ from: admin, gas: 1000000 });
      
      showToast("Election reset successfully!", "success");
      fetchElectionStats();
      fetchCandidates();
      fetchVoters();
    } catch (error: any) {
      console.error("Reset election error:", error);
      showToast(`Error resetting election: ${error.message || 'Unknown error'}`, "error");
    }
  };

  const handlePauseContract = async () => {
    try {
      const { contract, admin } = await getWeb3Contract();
      const newPauseState = !electionStats.isPaused;
      
      await contract.methods.pauseContract(newPauseState).send({ from: admin, gas: 1000000 });
      
      showToast(`Contract ${newPauseState ? 'paused' : 'unpaused'} successfully!`, "success");
      fetchElectionStats();
    } catch (error: any) {
      console.error("Pause contract error:", error);
      showToast(`Error updating contract pause state: ${error.message || 'Unknown error'}`, "error");
    }
  };

  const handleAddAdmin = async () => {
    try {
      await axios.post("/api/admin/addAdmin", newAdminForm);
      showToast("Admin added successfully!", "success");
      setNewAdminForm({ email: "", password: "", name: "" });
    } catch (error) {
      showToast("Error adding admin.", "error");
    }
  };

  const isElectionActive = () => {
    const now = Math.floor(Date.now() / 1000);
    return electionStats.votingStart > 0 && 
           electionStats.votingEnd > 0 && 
           now >= electionStats.votingStart && 
           now <= electionStats.votingEnd &&
           !electionStats.isPaused;
  };

  const hasElectionStarted = () => {
    return electionStats.votingStart > 0;
  };

  const hasElectionEnded = () => {
    const now = Math.floor(Date.now() / 1000);
    return electionStats.votingStart > 0 && 
           electionStats.votingEnd > 0 && 
           now > electionStats.votingEnd;
  };

  const getElectionStatus = () => {
    if (electionStats.isPaused) return "Paused";
    if (!electionStats.detailsSet) return "Not Setup";
    if (electionStats.votingStart === 0) return "Not Started";
    if (isElectionActive()) return "Active";
    return "Ended";
  };

  const getStatusColor = () => {
    const status = getElectionStatus();
    switch (status) {
      case "Active": return "text-green-500";
      case "Paused": return "text-red-500";
      case "Not Setup": return "text-gray-500";
      case "Not Started": return "text-yellow-500";
      case "Ended": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Election Overview</h2>
        <div className="flex items-center space-x-4">
          {mounted && lastRefresh && (
            <span className="text-sm text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshData}
            disabled={refreshing}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              refreshing 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {refreshing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-dashed rounded-full animate-spin"></div>
                <span>Refreshing...</span>
              </div>
            ) : (
              "🔄 Refresh"
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-400">Election Status</h3>
          <p className={`text-2xl font-bold ${getStatusColor()}`}>{getElectionStatus()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-400">Total Candidates</h3>
          <p className="text-2xl font-bold text-white">{electionStats.candidateCount}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-400">Registered Voters</h3>
          <p className="text-2xl font-bold text-white">{electionStats.voterCount}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-400">Votes Cast</h3>
          <p className="text-2xl font-bold text-white">{electionStats.totalVotesCast}</p>
        </div>
      </div>

      {/* Election Timeline */}
      {electionStats.votingStart > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-400 mb-4">Election Timeline</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Start:</span> {new Date(electionStats.votingStart * 1000).toLocaleString()}</p>
            <p><span className="font-medium">End:</span> {new Date(electionStats.votingEnd * 1000).toLocaleString()}</p>
            {isElectionActive() && (
              <div className="mt-4">
                <div className="bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, ((Date.now() / 1000 - electionStats.votingStart) / (electionStats.votingEnd - electionStats.votingStart)) * 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Time remaining: {Math.max(0, Math.floor((electionStats.votingEnd - Date.now() / 1000) / 60))} minutes
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderSetup = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-indigo-400 mb-6">Election Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-indigo-400">Admin Name</label>
            <input
              type="text"
              value={electionForm.adminName}
              onChange={(e) => setElectionForm({...electionForm, adminName: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Admin Email</label>
            <input
              type="email"
              value={electionForm.adminEmail}
              onChange={(e) => setElectionForm({...electionForm, adminEmail: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Admin Title</label>
            <input
              type="text"
              value={electionForm.adminTitle}
              onChange={(e) => setElectionForm({...electionForm, adminTitle: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Election Title</label>
            <input
              type="text"
              value={electionForm.electionTitle}
              onChange={(e) => setElectionForm({...electionForm, electionTitle: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Organization Title</label>
            <input
              type="text"
              value={electionForm.organizationTitle}
              onChange={(e) => setElectionForm({...electionForm, organizationTitle: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Max Votes Per Candidate</label>
            <input
              type="number"
              value={electionForm.maxVotes}
              onChange={(e) => setElectionForm({...electionForm, maxVotes: parseInt(e.target.value)})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Duration (Minutes)</label>
            <input
              type="number"
              value={electionForm.durationMinutes}
              onChange={(e) => setElectionForm({...electionForm, durationMinutes: parseInt(e.target.value)})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              min="1"
            />
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handleSetElectionDetails}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mr-4"
          >
            Set Election Details
          </button>
          <button
            onClick={handleStartElection}
            disabled={!electionStats.detailsSet || hasElectionStarted()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title={!electionStats.detailsSet ? "Please set election details first" : hasElectionStarted() ? "Election already started" : "Start the election"}
          >
            Start Election
          </button>
        </div>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-indigo-400 mb-6">Upload Voter & Candidate Data</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-400">Select Voter JSON File</label>
            <input 
              type="file" 
              accept=".json" 
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-700" 
              onChange={(e) => setVoterFile(e.target.files ? e.target.files[0] : null)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Select Candidate JSON File</label>
            <input 
              type="file" 
              accept=".json" 
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-700" 
              onChange={(e) => setCandidateFile(e.target.files ? e.target.files[0] : null)} 
            />
          </div>
          
          {loading && (
            <div className="flex items-center space-x-2 justify-center text-indigo-400">
              <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin" />
              <p className="text-sm font-medium">Processing files, please wait...</p>
            </div>
          )}

          <button
            onClick={handleFileUpload}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload & Process Files"}
          </button>
        </div>
      </div>

      {/* Display current candidates */}
      {candidates.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-indigo-400 mb-4">Current Candidates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold text-white">{candidate.name}</h4>
                <p className="text-gray-300 text-sm">{candidate.slogan}</p>
                <p className="text-indigo-400 text-sm">Votes: {candidate.votes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display registered voters */}
      {voters.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-indigo-400 mb-4">Registered Voters ({voters.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-indigo-400">Name</th>
                  <th className="text-left py-2 text-indigo-400">Email</th>
                  <th className="text-left py-2 text-indigo-400">Roll Number</th>
                  <th className="text-left py-2 text-indigo-400">Phone</th>
                  <th className="text-left py-2 text-indigo-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {voters.slice(0, 10).map((voter) => (
                  <tr key={voter._id} className="border-b border-gray-700">
                    <td className="py-2 text-white">{voter.name}</td>
                    <td className="py-2 text-gray-300">{voter.email}</td>
                    <td className="py-2 text-gray-300">{voter.rollNumber}</td>
                    <td className="py-2 text-gray-300">{voter.phoneNumber}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        voter.mustChangePassword 
                          ? 'bg-yellow-600 text-yellow-100' 
                          : 'bg-green-600 text-green-100'
                      }`}>
                        {voter.mustChangePassword ? 'Pending Password Change' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {voters.length > 10 && (
              <p className="text-gray-400 text-sm mt-2">
                Showing 10 of {voters.length} voters
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderManage = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-indigo-400 mb-6">Election Management</h3>
        
        {/* Current Election Status */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="text-lg font-medium text-white mb-2">Current Status</h4>
          <p className={`text-sm ${getStatusColor()}`}>
            {getElectionStatus()}
          </p>
          {hasElectionStarted() && (
            <div className="mt-2 text-sm text-gray-400">
              <p>Started: {new Date(electionStats.votingStart * 1000).toLocaleString()}</p>
              <p>Ends: {new Date(electionStats.votingEnd * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={handleEndElection}
            disabled={!hasElectionStarted() || hasElectionEnded()}
            className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title={!hasElectionStarted() ? "No active election" : hasElectionEnded() ? "Election already ended" : "End the current election"}
          >
            End Election
          </button>
          <button
            onClick={handleResetElection}
            disabled={isElectionActive()}
            className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title={isElectionActive() ? "Cannot reset active election" : "Reset all election data"}
          >
            Reset Election
          </button>
          <button
            onClick={handlePauseContract}
            className={`px-4 py-3 text-white rounded-lg transition-colors ${electionStats.isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
            title={electionStats.isPaused ? "Resume contract operations" : "Pause all contract operations"}
          >
            {electionStats.isPaused ? 'Unpause' : 'Pause'} Contract
          </button>
          <button
            onClick={() => router.push("/results")}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="View current election results"
          >
            View Results
          </button>
        </div>
      </div>

      {/* Real-time stats */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-indigo-400 mb-4">Real-time Statistics</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Voter Turnout:</span>
            <span className="font-semibold">
              {electionStats.voterCount > 0 ? ((electionStats.totalVotesCast / electionStats.voterCount) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="bg-gray-700 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${electionStats.voterCount > 0 ? (electionStats.totalVotesCast / electionStats.voterCount) * 100 : 0}%`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVoters = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-indigo-400">Registered Voters</h3>
          <button
            onClick={fetchVoters}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh List
          </button>
        </div>
        
        {voters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 text-indigo-400 font-semibold">Name</th>
                  <th className="text-left py-3 text-indigo-400 font-semibold">Email</th>
                  <th className="text-left py-3 text-indigo-400 font-semibold">Roll Number</th>
                  <th className="text-left py-3 text-indigo-400 font-semibold">Phone</th>
                  <th className="text-left py-3 text-indigo-400 font-semibold">Status</th>
                  <th className="text-left py-3 text-indigo-400 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((voter) => (
                  <tr key={voter._id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="py-3 text-white font-medium">{voter.name}</td>
                    <td className="py-3 text-gray-300">{voter.email}</td>
                    <td className="py-3 text-gray-300">{voter.rollNumber}</td>
                    <td className="py-3 text-gray-300">{voter.phoneNumber}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        voter.mustChangePassword 
                          ? 'bg-yellow-600 text-yellow-100' 
                          : 'bg-green-600 text-green-100'
                      }`}>
                        {voter.mustChangePassword ? 'Pending Password Change' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-sm">
                      {voter.createdAt ? new Date(voter.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No voters registered yet.</p>
            <p className="text-sm text-gray-500 mt-2">Upload voter data to get started.</p>
          </div>
        )}
      </div>
      
      {/* Voter Statistics */}
      {voters.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-indigo-400 mb-4">Voter Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-white">{voters.length}</p>
              <p className="text-gray-400">Total Registered</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400">
                {voters.filter(v => !v.mustChangePassword).length}
              </p>
              <p className="text-gray-400">Active Voters</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {voters.filter(v => v.mustChangePassword).length}
              </p>
              <p className="text-gray-400">Pending Setup</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAdmins = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-indigo-400 mb-6">Add New Admin</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-400">Name</label>
            <input
              type="text"
              value={newAdminForm.name}
              onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Email</label>
            <input
              type="email"
              value={newAdminForm.email}
              onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-400">Password</label>
            <input
              type="password"
              value={newAdminForm.password}
              onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleAddAdmin}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Admin
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="bg-gray-950 text-white min-h-screen">
      <AdminHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="py-12">
          <div className="pb-8 text-center">
            <h1 className="text-4xl font-bold text-indigo-400">Admin Dashboard</h1>
            <p className="text-gray-400 mt-2">Manage your decentralized voting system</p>
          </div>

          {/* Admin Navigation */}
          <AdminNavigation />

          {/* Navigation Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-8 border-b border-gray-700">
              {[
                { id: "overview", label: "Overview" },
                { id: "setup", label: "Election Setup" },
                { id: "upload", label: "Upload Data" },
                { id: "voters", label: "Voters" },
                { id: "manage", label: "Manage Election" },
                { id: "admins", label: "Manage Admins" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {activeTab === "overview" && renderOverview()}
            {activeTab === "setup" && renderSetup()}
            {activeTab === "upload" && renderUpload()}
            {activeTab === "voters" && renderVoters()}
            {activeTab === "manage" && renderManage()}
            {activeTab === "admins" && renderAdmins()}
          </div>
        </div>
      </div>
    </section>
  );
}
