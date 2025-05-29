import mongoose from "mongoose";
const VoterSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  phoneNumber: { type: Number, required: true, unique: true },
  Ethaccount : String,
  mustChangePassword: { type: Boolean, default: true },
  ipfsHash: String,
});

export default mongoose.models.Voter || mongoose.model("Voter", VoterSchema);

//   isVerified: { type: Boolean, default: false },