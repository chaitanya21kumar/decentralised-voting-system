// models/IpfsHash.ts
import mongoose from "mongoose";

const IpfsHashSchema = new mongoose.Schema({
  hash: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  type: { type: String, enum: ["candidates", "voters"], default: "candidates" },
});

export default mongoose.models.IpfsHash || mongoose.model("IpfsHash", IpfsHashSchema);
