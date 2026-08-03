// ── The Rail — Firebase Config ─────────────────────────────────────
//
//  HOW TO SET UP (takes ~5 minutes):
//  1. Go to console.firebase.google.com and sign in with Google
//  2. Click "Add project" → give it a name (e.g. "the-rail") → continue
//  3. In the left menu: Build → Realtime Database → Create database
//     → choose a region → Start in TEST MODE → Enable
//  4. In the left menu: Project settings (gear icon) → Your apps
//     → click the </> web icon → register app → copy the firebaseConfig
//  5. Paste the values from that config into the fields below
//  6. Go to Realtime Database → Rules and paste the contents of
//     database.rules.json from this repo, then click Publish
//  7. Save this file — the app updates automatically
//
// ────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyCaVagLuYX9vy7IRQ_bQgNCRBwTI2PJpVk",
  authDomain: "the-rail-bar-inventory.firebaseapp.com",
  databaseURL: "https://the-rail-bar-inventory-default-rtdb.firebaseio.com",
  projectId: "the-rail-bar-inventory",
  storageBucket: "the-rail-bar-inventory.firebasestorage.app",
  messagingSenderId: "342214984925",
  appId: "1:342214984925:web:1b509e284596bc39c0c734",
};

// Don't touch below this line ─────────────────────────────────────

(function () {
  const ready = !firebaseConfig.apiKey.startsWith('PASTE') &&
                !firebaseConfig.databaseURL.includes('PASTE_PROJECT_ID');
  if (!ready) {
    window.railDB = null;
    console.log('[The Rail] Firebase not configured yet — edit firebase-config.js');
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    window.railDB = firebase.database();
    console.log('[The Rail] Firebase connected ✓');

    // Test-mode rules expire after 30 days; when they do, reads/writes
    // silently fail with PERMISSION_DENIED. Surface that clearly.
    window.railDB.ref('bar-inventory').limitToFirst(1).once('value')
      .then(() => console.log('[The Rail] Firebase rules OK ✓'))
      .catch((err) => {
        if (err.code === 'PERMISSION_DENIED') {
          console.error('[The Rail] 🚫 Firebase rules are blocking reads/writes!');
          showRulesBanner();
        }
      });
  } catch (e) {
    window.railDB = null;
    console.warn('[The Rail] Firebase init failed:', e.message);
  }

  function showRulesBanner() {
    if (document.getElementById('rail-rules-banner')) return;
    const b = document.createElement('div');
    b.id = 'rail-rules-banner';
    b.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;' +
      'background:#7a1f1f;color:#f4e9d8;padding:10px 16px;' +
      'font:14px/1.4 system-ui,sans-serif;text-align:center;';
    b.innerHTML =
      '⚠️ Firebase rules are blocking sync — inventory won\'t save across devices. ' +
      '<a href="https://console.firebase.google.com/project/' +
      firebaseConfig.projectId + '/database/' + firebaseConfig.projectId +
      '-default-rtdb/rules" target="_blank" rel="noopener noreferrer" ' +
      'style="color:#d4af37;font-weight:bold;">Fix in Firebase Console →</a>' +
      '&nbsp;&nbsp;<button onclick="this.parentNode.remove()" ' +
      'style="background:none;border:1px solid rgba(244,233,216,0.5);' +
      'color:#f4e9d8;cursor:pointer;padding:2px 8px;border-radius:3px;">✕</button>';
    const attach = () => document.body.prepend(b);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
    else attach();
  }
})();
