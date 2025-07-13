"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { showToast, showToastPromise } from "../../pages/api/admin/showToast";

interface ElectionControlPanelProps {
  electionStatus: "not_started" | "running" | "ended";
  detailsSet?: boolean;
  onUpdate: () => void;
}

export function ElectionControlPanel({ 
  electionStatus, 
  detailsSet = false, 
  onUpdate 
}: ElectionControlPanelProps) {
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [setupData, setSetupData] = useState({
    adminName: "",
    adminEmail: "",
    adminTitle: "",
    electionTitle: "",
    organizationTitle: "",
    maxVotes: 1000,
  });
  const [startDuration, setStartDuration] = useState(60); // minutes
  const [newCandidate, setNewCandidate] = useState({ name: "", slogan: "" });
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleElectionSetup = async () => {
    if (!setupData.electionTitle) {
      showToast("Election title is required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/admin/dashboard/election-control", {
        action: "setElectionDetails",
        ...setupData,
      });

      if (response.data.success) {
        showToast("Election details set successfully!", "success");
        setShowSetupForm(false);
        onUpdate();
      } else {
        showToast(response.data.message || "Failed to set election details", "error");
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Error setting election details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartElection = async () => {
    if (!detailsSet) {
      showToast("Please set election details first", "error");
      return;
    }

    setLoading(true);
    const promise = axios.post("/api/admin/dashboard/election-control", {
      action: "startElection",
      durationMinutes: startDuration,
    });

    showToastPromise(promise, {
      loading: "Starting election...",
      success: "Election started successfully!",
      error: "Failed to start election",
    }).then(() => {
      onUpdate();
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  const handleEndElection = async () => {
    setLoading(true);
    const promise = axios.post("/api/admin/dashboard/election-control", {
      action: "endElection",
    });

    showToastPromise(promise, {
      loading: "Ending election...",
      success: "Election ended successfully!",
      error: "Failed to end election",
    }).then(() => {
      onUpdate();
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  const handleDeclareWinner = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/admin/dashboard/election-control", {
        action: "declareWinner",
      });

      if (response.data.success) {
        const { winner } = response.data;
        showToast(
          `Winner: ${winner.winnerName} with ${winner.maxVotes} votes!`,
          "success"
        );
        onUpdate();
      } else {
        showToast(response.data.message || "Failed to declare winner", "error");
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Error declaring winner", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name) {
      showToast("Candidate name is required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/admin/dashboard/election-control", {
        action: "addCandidate",
        name: newCandidate.name,
        slogan: newCandidate.slogan,
      });

      if (response.data.success) {
        showToast("Candidate added successfully!", "success");
        setNewCandidate({ name: "", slogan: "" });
        setShowAddCandidate(false);
        onUpdate();
      } else {
        showToast(response.data.message || "Failed to add candidate", "error");
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Error adding candidate", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 p-6 rounded-lg border border-gray-700"
    >
      <h3 className="text-lg font-semibold mb-4 text-indigo-400">Election Control</h3>

      <div className="space-y-4">
        {/* Election Setup */}
        {!detailsSet && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-yellow-400">Setup Required</h4>
                <p className="text-sm text-gray-400">Configure election details before starting</p>
              </div>
              <button
                onClick={() => setShowSetupForm(!showSetupForm)}
                className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded transition"
                disabled={loading}
              >
                {showSetupForm ? "Cancel" : "Setup"}
              </button>
            </div>

            {showSetupForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Admin Name"
                    value={setupData.adminName}
                    onChange={(e) => setSetupData({ ...setupData, adminName: e.target.value })}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Admin Email"
                    value={setupData.adminEmail}
                    onChange={(e) => setSetupData({ ...setupData, adminEmail: e.target.value })}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Admin Title"
                    value={setupData.adminTitle}
                    onChange={(e) => setSetupData({ ...setupData, adminTitle: e.target.value })}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Election Title *"
                    value={setupData.electionTitle}
                    onChange={(e) => setSetupData({ ...setupData, electionTitle: e.target.value })}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Organization Title"
                    value={setupData.organizationTitle}
                    onChange={(e) => setSetupData({ ...setupData, organizationTitle: e.target.value })}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max Votes Per Candidate"
                    value={setupData.maxVotes}
                    onChange={(e) => setSetupData({ ...setupData, maxVotes: parseInt(e.target.value) || 1000 })}
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                    min="1"
                  />
                </div>
                <button
                  onClick={handleElectionSetup}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded transition disabled:opacity-50"
                >
                  {loading ? "Setting up..." : "Set Election Details"}
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Add Candidate */}
        {detailsSet && electionStatus === "not_started" && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-blue-400">Add Candidates</h4>
                <p className="text-sm text-gray-400">Add candidates before starting election</p>
              </div>
              <button
                onClick={() => setShowAddCandidate(!showAddCandidate)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
                disabled={loading}
              >
                {showAddCandidate ? "Cancel" : "Add Candidate"}
              </button>
            </div>

            {showAddCandidate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 space-y-3"
              >
                <input
                  type="text"
                  placeholder="Candidate Name *"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Campaign Slogan"
                  value={newCandidate.slogan}
                  onChange={(e) => setNewCandidate({ ...newCandidate, slogan: e.target.value })}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={handleAddCandidate}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Candidate"}
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Election Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Election */}
          {electionStatus === "not_started" && detailsSet && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Duration (minutes)</label>
              <input
                type="number"
                value={startDuration}
                onChange={(e) => setStartDuration(parseInt(e.target.value) || 60)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-green-500 outline-none"
                min="1"
                max="10080" // Max 1 week
              />
              <button
                onClick={handleStartElection}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition disabled:opacity-50"
              >
                {loading ? "Starting..." : "Start Election"}
              </button>
            </div>
          )}

          {/* End Election */}
          {electionStatus === "running" && (
            <button
              onClick={handleEndElection}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? "Ending..." : "End Election"}
            </button>
          )}

          {/* Declare Winner */}
          {electionStatus === "ended" && (
            <button
              onClick={handleDeclareWinner}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? "Declaring..." : "Declare Winner"}
            </button>
          )}
        </div>

        {/* Status Info */}
        <div className="text-sm text-gray-400">
          <p>
            Status: <span className="text-white">{electionStatus.replace("_", " ").toUpperCase()}</span>
          </p>
          {!detailsSet && <p className="text-yellow-400">⚠️ Election details must be set first</p>}
        </div>
      </div>
    </motion.div>
  );
}