// One-off script: provisions the very first account (yours) in the new
// multi-tenant structure. Does three things, in order:
//   1. Copies the existing shared /bar-inventory data to /bars/{uid}
//      (COPY only — never touches or deletes /bar-inventory, so this
//      is safe to run and inspect before cleaning up the old data by
//      hand later).
//   2. Creates /users/{uid} = { barId: uid, role: 'admin', email }.
//   3. Grants the { admin: true } custom claim on your account.
//
// Usage:
//   1. Firebase console → Project settings (gear icon) → Service accounts
//      → "Generate new private key" → save the downloaded JSON file
//      somewhere OUTSIDE this repo (never commit it).
//   2. From this directory: npm install firebase-admin
//   3. node bootstrap-owner.js /path/to/serviceAccountKey.json <uid>
//
//      <uid> is your own User UID from Firebase console → Authentication
//      → Users.

const path = require('path');

const [, , keyPath, uid] = process.argv;

if (!keyPath || !uid) {
  console.error('Usage: node bootstrap-owner.js <path-to-service-account-key.json> <uid>');
  process.exit(1);
}

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('Missing dependency. Run "npm install firebase-admin" in this directory first.');
  process.exit(1);
}

const serviceAccount = require(path.resolve(keyPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://the-rail-bar-inventory-default-rtdb.firebaseio.com',
});

const db = admin.database();

async function main() {
  const userRecord = await admin.auth().getUser(uid);
  console.log(`Provisioning ${userRecord.email} (${uid}) as the admin...`);

  const oldSnap = await db.ref('bar-inventory').once('value');
  const oldData = oldSnap.val();
  if (oldData) {
    await db.ref('bars/' + uid).set(oldData);
    console.log('✓ Copied /bar-inventory to /bars/' + uid + ' (old data left untouched).');
  } else {
    console.log('  Nothing found at /bar-inventory — skipping copy, starting with an empty bar.');
  }

  await db.ref('users/' + uid).set({
    barId: uid,
    role: 'admin',
    email: userRecord.email,
  });
  console.log('✓ Created /users/' + uid + ' profile.');

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log('✓ Granted the admin custom claim.');

  console.log('\nDone. Sign out and back in on the site for the admin claim to take effect.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
