// One-off script to fix a user's role.
// Usage: node fixRole.js <email> <vet|owner>
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const User = require('./models/User');

async function run() {
  const [, , email, role] = process.argv;
  if (!email || !['vet', 'owner'].includes(role)) {
    console.error('Usage: node fixRole.js <email> <vet|owner>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const result = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role },
    { new: true }
  );
  if (!result) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  console.log(`Updated ${result.email} → role: ${result.role}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
