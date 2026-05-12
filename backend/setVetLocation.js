// Quick utility to attach clinic info + GPS coords to a vet account.
// Usage: node setVetLocation.js <email> <lat> <lng> [clinicName] [address] [phone] [onCall]
//
//   node setVetLocation.js edan3928@gmail.com 32.0853 34.7818 "Tel Aviv Vet Clinic" "Dizengoff 100, Tel Aviv" "03-1234567" true

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const User = require('./models/User');

async function run() {
  const [, , email, latStr, lngStr, clinicName = '', address = '', phone = '', onCallStr = 'false'] = process.argv;
  if (!email || !latStr || !lngStr) {
    console.error('Usage: node setVetLocation.js <email> <lat> <lng> [clinicName] [address] [phone] [true|false]');
    process.exit(1);
  }
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error('lat and lng must be numbers.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const updated = await User.findOneAndUpdate(
    { email: email.toLowerCase(), role: 'vet' },
    {
      lat, lng,
      clinicName,
      address,
      phone,
      isOnCall: onCallStr === 'true',
    },
    { new: true }
  );
  if (!updated) {
    console.error(`No vet found with email: ${email}`);
    process.exit(1);
  }
  console.log(`Updated ${updated.email}:`);
  console.log(`  Clinic:   ${updated.clinicName || '(none)'}`);
  console.log(`  Address:  ${updated.address || '(none)'}`);
  console.log(`  Phone:    ${updated.phone || '(none)'}`);
  console.log(`  Coords:   ${updated.lat}, ${updated.lng}`);
  console.log(`  On call:  ${updated.isOnCall}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
