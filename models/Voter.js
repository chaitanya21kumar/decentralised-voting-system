// models/Voter.js
import mongoose from "mongoose";

/**
 * Each voter may now have:
 *  – faceEmbedding … 128-float array from face-api.js
 *  – faceSet …… flag so we know the reference photo exists
 */
const VoterSchema = new mongoose.Schema({
  rollNumber       : { type: String, required: true, unique: true },
  name             : String,
  email            : { type: String, required: true, unique: true },
  passwordHash     : String,
  phoneNumber      : { type: Number, required: true, unique: true },
  Ethaccount       : String,
  mustChangePassword: { type: Boolean, default: true },
  ipfsHash         : String,

  // NEW ⬇︎
  faceEmbedding    : { type: [Number] },     // 128 floats
  faceSet          : { type: Boolean, default: false },
});

export default mongoose.models.Voter || mongoose.model("Voter", VoterSchema);
