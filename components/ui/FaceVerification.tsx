// components/ui/FaceVerification.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js/dist/face-api.js";

interface Props {
  rollNumber: string;          // NEW: so we can load the reference photo
  onVerified: () => void;
}

export default function FaceVerification({ rollNumber, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [err, setErr] = useState("");

  /* ── load models + start cam ─────────────────────────────── */
  useEffect(() => {
    const MODEL_URL =
      "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
    (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsReady(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    })().catch(() => setErr("🚫 Camera or model load failed."));
    return () => {
      (videoRef.current?.srcObject as MediaStream | undefined)
        ?.getTracks()
        .forEach((t) => t.stop());
    };
  }, []);

  /* ── main verify button ──────────────────────────────────── */
  const verify = async () => {
    if (!videoRef.current) return;

    /* 1. load reference image (if it exists) */
    let refDescriptor: Float32Array | null = null;
    try {
      const refImg = await faceapi.fetchImage(
        `/voter_photos/${rollNumber}.jpg`
      );
      const refDet = await faceapi
        .detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      refDescriptor = refDet?.descriptor || null;
    } catch {
      // ignore — we’ll fall back to liveness only
    }

    /* 2. detect live face */
    const liveDet = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!liveDet) {
      setErr("No face detected – try again.");
      return;
    }

    /* 3. compare or accept */
    if (refDescriptor) {
      const dist = faceapi.euclideanDistance(
        refDescriptor,
        liveDet.descriptor
      );
      if (dist < 0.6) {
        onVerified(); // ✅ match
      } else {
        setErr("Face does not match reference photo.");
      }
    } else {
      // fallback to liveness-only
      onVerified();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width={320}
        height={240}
        className="rounded border border-gray-600 mb-4"
      />
      {err && <p className="text-red-400 mb-2">{err}</p>}
      <button
        onClick={verify}
        disabled={!modelsReady}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {modelsReady ? "Verify Face" : "Loading models…"}
      </button>
    </div>
  );
}
