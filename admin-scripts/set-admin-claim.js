// One-off script: grants the Firebase custom claim { admin: true } to a
// user, so The Rail's security rules recognize them as the master admin
// (able to see every bar, not just their own). Run this once, locally,
// for the owner's account — not something the app itself can do, since
// custom claims can only be set with the Admin SDK, which requires
// privileged service-account credentials that must never reach the
// browser.
//
// Usage:
//   1. Firebase console → Project settings (gear icon) → Service accounts
//      → "Generate new private key" → save the downloaded JSON file
//      somewhere OUTSIDE this repo (never commit it — this directory's
//      .gitignore already blocks common names, but keeping it outside
//      the repo entirely is safer).
//   2. From this directory: npm install firebase-admin
//   3. Find the target uid: Firebase console → Authentication → Users →
//      copy the "User UID" column for the account to make admin.
//   4. node set-admin-claim.js /path/to/serviceAccountKey.json <uid>
//
// After running: that user needs to sign out and back in (or wait up to
// ~1hr for their session to naturally refresh) before admin-gated rules
// recognize them — the custom claim is baked into the ID token, which
// isn't reissued until then.

const path = require('path');

const [, , keyPath, uid] = process.argv;

if (!keyPath || !uid) {
  console.error('Usage: node set-admin-claim.js <path-to-service-account-key.json> <uid>');
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
});

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✓ ${uid} is now an admin.`);
    console.log('  They need to sign out and back in for it to take effect immediately.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to set admin claim:', err.message);
    process.exit(1);
  });
