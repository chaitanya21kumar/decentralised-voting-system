"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { loadModels, getFaceEmbedding } from "@/lib/face";

type Props = { onComplete: (embedding: number[]) => void };

export default function FaceSetup({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState<"init" | "blink" | "done">("init");
  const [error, setError] = useState("");

  // Start webcam + load models
  useEffect(() => {
    (async () => {
      await loadModels();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    })();
  }, []);

  /** simple blink liveness: no-face → face again */
  useEffect(() => {
    if (stage !== "init") return;

    let lastHasFace = true;
    const id = setInterval(async () => {
      if (!videoRef.current) return;
      const emb = await getFaceEmbedding(videoRef.current);
      const hasFace = !!emb;

      if (lastHasFace && !hasFace) setStage("blink"); // eyes closed
      if (!lastHasFace && hasFace && emb) {
        clearInterval(id);
        setStage("done");
        try {
          await axios.post("/api/voter/set-face", { embedding: emb });
          onComplete(emb);                 // ← hand embedding to parent
        } catch (e) {
          setError("Failed to save face, try again.");
        }
      }
      lastHasFace = hasFace;
    }, 500);

    return () => clearInterval(id);
  }, [stage, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <video ref={videoRef} autoPlay muted className="rounded-xl w-64 h-64 bg-black" />
      {error && <p className="text-red-500">{error}</p>}
      {stage === "init"   && <p>Blink once to record your face…</p>}
      {stage === "blink"  && <p>Great! Hold still… 📸</p>}
      {stage === "done"   && <p className="text-green-600">Saved ✅</p>}
    </div>
  );
}
