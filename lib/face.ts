// lib/face.ts
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";   // served from /public/models

export async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

export async function getFaceEmbedding(video: HTMLVideoElement) {
  const detections = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withFaceDescriptor();               // 128-float descriptor

  if (!detections) return null;
  return Array.from(detections.descriptor); // convert Float32Array → number[]
}

// Euclidean distance between two 128-vectors
export function faceDistance(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}
