// app/artifacts/votingArtifact.js
import Voting from "../../artifacts/contracts/Voting.sol/Voting.json";   // <-- ABI
import addressJson from "./deployedAddress.json";         // <-- address file

export const votingABI = Voting.abi;
export const votingAddress = addressJson.address;
