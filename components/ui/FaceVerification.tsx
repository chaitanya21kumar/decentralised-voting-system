// components/ui/FaceVerification.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js/build/es6/index.js";

interface Props {
  rollNumber: string;
  onVerified: () => void;
}

export default function FaceVerification({ rollNumber, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [err, setErr] = useState<string>("");

  /* ───────────────────── 1. load models  ──────────────────── */
  useEffect(() => {
    const MODEL_URL = "/models";


    (async () => {
      /* A –––––––––––––––––– download weights ––––––––––––––– */
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
      } catch (e) {
        console.error("face-api model error", e);
        setErr("❌ model download failed – check Network tab.");
        return;
      }

      /* B –––––––––––––––––– open webcam –––––––––––––––––––– */
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setModelsReady(true);
      } catch (e) {
        console.error("getUserMedia error", e);
        setErr(
          "❌ camera permission / availability problem – allow access and reload."
        );
      }
    })();

    /* cleanup on unmount */
    return () => {
      (videoRef.current?.srcObject as MediaStream | undefined)
        ?.getTracks()
        .forEach((t) => t.stop());
    };
  }, []);

  /* ───────────────────── 2. verify button ─────────────────── */
  const verify = async () => {
    if (!videoRef.current) return;

    /* 2-A. load reference image (optional) */
    let refDescriptor: Float32Array | null = null;
    try {
      const refImg = await faceapi.fetchImage(
        `/voter_photos/${rollNumber}.jpg`
      );
      const refDet = await faceapi
        .detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      refDescriptor = refDet?.descriptor ?? null;
    } catch {
      /* no stored image → liveness-only fallback */
    }

    /* 2-B. detect live face */
    const liveDet = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!liveDet) {
      setErr("No face detected – try again.");
      return;
    }

    /* 2-C. compare vs. reference OR accept */
    if (refDescriptor) {
      const dist = faceapi.euclideanDistance(
        refDescriptor,
        liveDet.descriptor
      );
      if (dist < 0.6) onVerified();
      else setErr("Face does not match reference photo.");
    } else {
      onVerified(); // liveness only
    }
  };

  /* ───────────────────── 3. render ────────────────────────── */
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
