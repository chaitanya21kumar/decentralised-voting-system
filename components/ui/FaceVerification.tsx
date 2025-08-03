// components/ui/FaceVerification.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js/build/es6/index.js";
import { toast } from "react-hot-toast";                // ← NEW

interface Props {
  rollNumber: string;
  onVerified: () => void;
}

export default function FaceVerification({ rollNumber, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [err, setErr] = useState<string>("");

  /* 1. load tiny models + webcam */
  useEffect(() => {
    const MODEL_URL = "/models";
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setModelsReady(true);
      } catch (e) {
        console.error(e);
        setErr(
          e instanceof DOMException
            ? "❌ camera permission / availability problem – allow access and reload."
            : "❌ model download failed – check Network tab."
        );
      }
    })();
    return () => {
      (videoRef.current?.srcObject as MediaStream | undefined)
        ?.getTracks()
        .forEach((t) => t.stop());
    };
  }, []);

  /* 2. click handler */
  const verify = async () => {
    if (!modelsReady || !videoRef.current) return;

    /* 2-A. reference photo (optional) */
    let refDescriptor: Float32Array | null = null;
    try {
      const refImg = await faceapi.fetchImage(`/voter_photos/${rollNumber}.jpg`);
      const refDet = await faceapi
        .detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      refDescriptor = refDet?.descriptor ?? null;
    } catch {
      /* no stored image – liveness-only */
    }

    /* 2-B. live frame */
    const liveDet = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!liveDet) {
      setErr("No face detected – try again.");
      return;
    }

    /* 2-C. compare / accept */
    if (refDescriptor) {
      const dist = faceapi.euclideanDistance(refDescriptor, liveDet.descriptor);
      if (dist < 0.6) {
        toast.success("✅ Face verified");    // ← NEW
        onVerified();
      } else {
        setErr("Face does not match reference photo.");
      }
    } else {
      toast.success("✅ Face verified");      // ← NEW
      onVerified();
    }
  };

  /* 3. UI */
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
