export async function verifyAndRegisterVoter(name: string, mobile: string, did: string, voterAddress: string, instance: any) {
    try {
        console.log(`🔍 Fetching DID from IPFS: ${did}`);

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/$bafkreieh66tcjgxn33rrbtofepjjj5blan4xtvkktkbekkeleij577nrmy`;
        const response = await fetch(ipfsUrl);

        if (!response.ok) {
            console.error("❌ Failed to fetch DID from IPFS.");
            return false;
        }

        const data = await response.json();
        console.log("✅ Retrieved DID:", data);

        if (data.id === did) {
            console.log("✅ DID Verified! Registering voter...");
            await instance.registerVoter(name, mobile, did, { from: voterAddress });
            console.log("🎉 Voter Registered Successfully!");
            return true;
        } else {
            console.error("❌ DID Mismatch! Registration failed.");
            return false;
        }
    } catch (error) {
        console.error("⚠️ Error verifying DID:", error);
        return false;
    }
}
