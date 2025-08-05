// scripts/wipeDb.js
const mongoose = require('mongoose');

async function run() {
  // Use the same URI your backend uses
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://mongo:27017/decentralised-voting-system';

  await mongoose.connect(uri);
  const db = mongoose.connection;

  await Promise.all([
    db.collection('voters').deleteMany({}),
    db.collection('ipfshashes').deleteMany({}),
    db.collection('admins').deleteMany({}),
  ]);

  console.log('✅  Mongo collections wiped');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
