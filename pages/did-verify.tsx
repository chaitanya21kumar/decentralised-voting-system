"use client";
import { useState } from "react";

export default function DIDVerify() {
  const [ipfsCid, setIpfsCid] = useState("");
  const [didData, setDidData] = useState(null);

  async function verifyDID() {
    const response = await fetch("/api/did/verify", {
      method: "POST",
      body: JSON.stringify({ ipfsCid }),
    });

    const data = await response.json();
    setDidData(data.didData);
  }

  return (
    <div>
      <h2>Verify Voter DID</h2>
      <input placeholder="Enter IPFS CID" onChange={(e) => setIpfsCid(e.target.value)} />
      <button onClick={verifyDID}>Verify</button>
      {didData && <pre>{JSON.stringify(didData, null, 2)}</pre>}
    </div>
  );
}
