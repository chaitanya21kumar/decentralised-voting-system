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
node scripts/addAdminCli.js <email> <password>
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


---

# 🐳 Dockerized Setup for Decentralised Voting System

This guide walks you through running the full project using **Docker** and **Docker Compose**, including:

- Next.js app (`voting-app`)
- MongoDB database (`voting-mongo`)
- Hardhat local blockchain (`voting-hardhat`)

---

## 🚀 10-Step Local Docker Setup

### 1. 📦 Prerequisites

Make sure you have:

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) installed
- `.env.local` properly configured

---

### 2. 🔧 Configure `.env.local`

Create a copy of the example:

```bash
cp .env.local.example .env.local
````

Then edit `.env.local`:

```env
MONGODB_URI=mongodb://mongo:27017/decentralised-voting-system
JWT_SECRET=your_jwt_secret
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
EMAIL_USER=multiversesyndrome@gmail.com
EMAIL_PASS=your_gmail_app_password
RPC_URL=http://hardhat:8545
```

> ⚠️ Use `mongo` and `hardhat` as hostnames (they're service names from Docker Compose).

---

### 3. 🐳 Start the Containers

```bash
docker-compose up --build
```

This starts:

* `voting-app` (Next.js dev server at `localhost:3000`)
* `voting-mongo` (MongoDB at `mongo:27017`)
* `voting-hardhat` (Hardhat node at `hardhat:8545`)

---

### 4. 🧑‍💻 Add Admin Account

```bash
docker exec -it voting-app node scripts/addAdminCli.js <email> <password>
```

---

### 5. 📡 Deploy Smart Contract

```bash
docker exec -it voting-app npx hardhat run scripts/deploy.js --network localhost
```

---

### 6. 🔁 Sync Deployed Address

```bash
docker exec -it voting-app cp frontend/artifacts/deployedAddress.json app/artifacts/
```

---

### 7. 🌐 Access the App

* **Admin UI**: [http://localhost:3000/admin](http://localhost:3000/admin)
* **Voter UI**: [http://localhost:3000/voter](http://localhost:3000/voter)
* **Results UI**: [http://localhost:3000/results](http://localhost:3000/results)

Login with:

```txt
Email:    multiversesyndrome@gmail.com
Password: SecurePass123
```

---

### 8. 🗳️ Upload Election Data

* Upload `testing/voters.json` and `testing/candidates.json`
* Click:

  * ✅ `Upload & Process`
  * ➕ `Add Candidates & Start Election`

---

### 9. 🧪 Cast a Vote

* Go to `/voter`
* Enter a roll number from `voters.json`
* Cast your vote

---

### 10. 📊 View Results

* Visit `/results`
* Countdown will trigger auto-tallying and display the winner 🎉

---

## 🧼 Cleanup & Reset (Optional)

To reset MongoDB:

```bash
docker exec -it voting-mongo mongosh --eval "db.getSiblingDB('decentralised-voting-system').dropDatabase()"
```

To stop and remove all containers and volumes:

```bash
docker-compose down -v
```

---

## 🛠 Useful Docker Commands

| Use Case                   | Command                                                            |                     |
| -------------------------- | ------------------------------------------------------------------ | ------------------- |
| Rebuild everything         | `docker-compose up --build`                                        |                     |
| Run admin CLI              | `docker exec -it voting-app node scripts/addAdminCli.js ...`       |                     |
| Deploy smart contract      | `docker exec -it voting-app npx hardhat run scripts/deploy.js ...` |                     |
| Check Mongo URI inside app | \`docker exec -it voting-app printenv                              | grep MONGODB\_URI\` |

---

## 📁 Project Structure for Docker

```txt
.
├── .env.local            # Docker-aware env file
├── Dockerfile
├── docker-compose.yml
├── app/                  # Next.js app
├── scripts/              # CLI and deployment helpers
├── frontend/artifacts/   # Smart contract artifacts
├── testing/              # Sample voter & candidate files
```

---

Let us know if you'd like to contribute, report bugs, or request features! 🚀

