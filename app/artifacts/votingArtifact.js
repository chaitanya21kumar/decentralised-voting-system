import Voting from "../../artifacts/contracts/Voting.sol/Voting.json";
import addressJson from "../../frontend/artifacts/deployedAddress.json";

export const votingAbi = Voting.abi;
export const votingAddress = addressJson.address;
