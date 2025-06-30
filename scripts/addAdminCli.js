const connectToDatabase = require('../lib/mongodb').default;
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin').default;

const email = process.argv[2];
const plainPassword = process.argv[3];

if (!email || !plainPassword) {
  console.error('Usage: node addAdmin.js <email> <password>');
  process.exit(1);
}

async function addAdmin(email, plainPassword) {
  try {
    await connectToDatabase();

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('Admin already exists with this email.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const newAdmin = new Admin({ email, password: hashedPassword });

    await newAdmin.save();
    console.log('Admin added successfully.');
  } catch (err) {
    console.error('Error adding admin:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addAdmin(email, plainPassword);
