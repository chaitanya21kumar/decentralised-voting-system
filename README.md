# 🗳️ Decentralised-Voting-System 🎉

A **full-stack** voting dApp built with **Next.js 14**, **TailwindCSS**, **Solidity/Hardhat**, **MongoDB**, **Pinata/IPFS**, and **Nodemailer (Gmail)**.  



---

## 📦 Prerequisites

- **Node.js 20.x** (use `nvm install 20 && nvm use 20`)  
- **npm 10+**  
- **MongoDB 6.x** (local or Atlas)  
- **Hardhat** (auto-installed via npm)  

---

## 🚀 10-Step First-Time Local Setup

### 1. Clone & Install  
```bash
git clone https://github.com/chaitanya21kumar/decentralised-voting-system.git
cd decentralised-voting-system
nvm install 20
nvm use 20
npm install
```

### 2. Configure Environment & MongoDB  
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your credentials:
```ini
MONGODB_URI=mongodb://127.0.0.1:27017/decentralised-voting-system
JWT_SECRET=<your_jwt_secret>
PINATA_API_KEY=<your_pinata_key>
PINATA_SECRET_KEY=<your_pinata_secret>
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
EMAIL_USER=multiversesyndrome@gmail.com
EMAIL_PASS=<your_gmail_app_password>
```
Start MongoDB:
```bash
mongod --dbpath ~/mongo-data
```

### 3. Seed Admin Account  
**Option A: HTTP**  
```bash
npm run dev   # in background
curl -X POST http://localhost:3000/api/admin/addAdmin \
  -H "Content-Type: application/json" \
  -d '{"email":"multiversesyndrome@gmail.com","password":"SecurePass123"}'
```
**Option B: CLI**  
```bash
node scripts/addAdminCli.js \
  --email multiversesyndrome@gmail.com \
  --password SecurePass123
```

### 4. Reset Local State (optional)  
```bash
mongosh --eval "db.getSiblingDB('decentralised-voting-system').dropDatabase()"
rm -rf .next
```

### 5. Start Hardhat Local Blockchain  
```bash
npx hardhat node
```
- **Account #0** → Admin  
- **Account #1 & #2** → Test voters  
  _Copy these into `testing/voters.json` → `accountNumber`_

### 6. Deploy Smart Contract  
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Watch for:
```
Voting deployed to: 0x…
```

### 7. Sync Deployed Address  
```bash
cp frontend/artifacts/deployedAddress.json app/artifacts/
```

### 8. Launch the App  
```bash
npm run dev
```
- Admin UI → http://localhost:3000/admin  
- Voter UI → http://localhost:3000/voter  
- Results UI → http://localhost:3000/results  

### 9. Admin: Upload & Start Election  
1. Log in as **multiversesyndrome@gmail.com / SecurePass123**  
2. Upload `testing/voters.json` (with `accountNumber`)  
3. Upload `testing/candidates.json`  
4. Click **Upload & Process** → success toast  
5. Click **Add Candidates & Start Election**  
   - Calls on-chain `addCandidate(...)`  
   - Calls `setElectionDetails(...)`  
   - Calls `startElection(10)` (10-minute window)

### 10. Voter Flow & Results  
- Go to `/voter` → enter roll number → **Verify Voter** ✅  
- Select candidate → **Submit Vote** ✅  
- Go to `/results` → countdown ⏳ → auto-tally → winner & percentages 🎊  

---

## 🛠 Troubleshooting

| Symptom            | Fix                                                         |
|--------------------|-------------------------------------------------------------|
| **DID mismatch**   | Confirm `accountNumber` matches on-chain registration       |
| Frontend no chain  | Ensure `npx hardhat node` is running at `127.0.0.1:8545`    |
| Emails not sent    | Check `EMAIL_USER` & `EMAIL_PASS` in `.env.local`           |
| Missing artifacts  | Run `npx hardhat compile` before deployment                 |

---


# All set! Enjoy your on-chain voting demo 🥳

