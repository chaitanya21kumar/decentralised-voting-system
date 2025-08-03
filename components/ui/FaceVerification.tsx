// components/ui/FaceVerification.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface Props {
  onVerified: () => void;
}

export default function FaceVerification({ onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState("");

  // Load models + start camera once
  useEffect(() => {
    const MODEL_URL =
      "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"; // ~5 MB total

    const load = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    };

    load().catch(() => setError("🚫 Camera or model load failed."));

    // Cleanup – stop cam on unmount
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  // Button handler
  const verifyNow = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi.detectAllFaces(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions()
    );

    if (detections.length === 1) {
      onVerified(); // ✅ success
    } else {
      setError(
        detections.length === 0
          ? "No face detected – try again."
          : "Multiple faces detected."
      );
    }
  };

  return (
    <div className="flex flex-col items-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={320}
        height={240}
        className="rounded border border-gray-600 mb-4"
      />
      {error && <p className="text-red-400 mb-2">{error}</p>}
      <button
        disabled={!modelsLoaded}
        onClick={verifyNow}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {modelsLoaded ? "Verify Face" : "Loading models…"}
      </button>
    </div>
  );
}
