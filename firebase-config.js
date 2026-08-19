// ── The Rail — Firebase Config ─────────────────────────────────────
//
//  HOW TO SET UP (takes ~5 minutes):
//  1. Go to console.firebase.google.com and sign in with Google
//  2. Click "Add project" → give it a name (e.g. "the-rail") → continue
//  3. In the left menu: Build → Realtime Database → Create database
//     → choose a region → Start in TEST MODE → Enable
//  4. In the left menu: Build → Authentication → Get started →
//     enable the "Email/Password" sign-in provider
//  5. In the left menu: Project settings (gear icon) → Your apps
//     → click the </> web icon → register app → copy the firebaseConfig
//  6. Paste the values from that config into the fields below
//  7. Go to Realtime Database → Rules and paste the contents of
//     database.rules.json from this repo, then click Publish
//  8. Save this file — the app updates automatically
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
    window.railAuth = null;
    console.log('[The Rail] Firebase not configured yet — edit firebase-config.js');
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    window.railDB = firebase.database();
    window.railAuth = firebase.auth();
    console.log('[The Rail] Firebase connected ✓');
  } catch (e) {
    window.railDB = null;
    window.railAuth = null;
    console.warn('[The Rail] Firebase init failed:', e.message);
  }

  // Shown when a signed-in user's reads/writes to their bar are denied —
  // almost always a rules-publish problem, not a code problem.
  window.railShowRulesBanner = function (message) {
    if (document.getElementById('rail-rules-banner')) return;
    const b = document.createElement('div');
    b.id = 'rail-rules-banner';
    b.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;' +
      'background:#7a1f1f;color:#f4e9d8;padding:10px 16px;' +
      'font:14px/1.4 system-ui,sans-serif;text-align:center;';
    b.innerHTML =
      '⚠️ ' + message + ' ' +
      '<a href="https://console.firebase.google.com/project/' +
      firebaseConfig.projectId + '/database/' + firebaseConfig.projectId +
      '-default-rtdb/rules" target="_blank" rel="noopener noreferrer" ' +
      'style="color:#d4af37;font-weight:bold;">Check Firebase Console →</a>' +
      '&nbsp;&nbsp;<button onclick="this.parentNode.remove()" ' +
      'style="background:none;border:1px solid rgba(244,233,216,0.5);' +
      'color:#f4e9d8;cursor:pointer;padding:2px 8px;border-radius:3px;">✕</button>';
    const attach = () => document.body.prepend(b);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
    else attach();
  };
})();
