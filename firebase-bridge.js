/* NWSDB Trip 2026 - Firebase bridge
 * Adds: real Firestore cloud sync (shared + permanent data) and an
 * organizer-only edit gate using a passcode.
 *
 * NOTE ON SECURITY: This app runs 100% on the free "no-card" plan, so the
 * organizer check is enforced in the UI (client-side). A technically skilled
 * visitor could bypass it. Do not store sensitive personal data here.
 *
 * To change the passcode: pick a new passcode, run
 *   node -e "console.log(require('crypto').createHash('sha256').update('NEW_PW').digest('hex'))"
 * and paste the result into PASS_HASH below, then redeploy.
 */
(function () {
  "use strict";

  var CONFIG = {
    apiKey: "AIzaSyAZkxC7No5-sKT4A5nf14HQAve5iJzihbE",
    authDomain: "nwsdb-trip-2026.firebaseapp.com",
    projectId: "nwsdb-trip-2026",
    storageBucket: "nwsdb-trip-2026.firebasestorage.app",
    messagingSenderId: "425862393005",
    appId: "1:425862393005:web:543e722b5b9d8e17dfaa24"
  };
  var PASS_HASH = "e3ead908cad84ab036ab1a8776155ec4e37ca1fb10b9da245ea32b6e9022c508"; // sha256("1235@com")
  var STORE_KEY = "nwsdb_owner_session";
  var COLLECTION = "trips";
  var DOCTRIP = "main";

  var api = {
    owner: false,
    ready: false,
    lastJSON: "",
    isOwner: function () { return api.owner === true; },
    isEditing: function () {
      var el = document.activeElement;
      return !!(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    },
    subscribe: function () { return function () {}; },
    save: function () {},
    ownerLogin: function () { return Promise.resolve(false); },
    signOut: function () {}
  };
  window.__NWSDB = api;

  try { if (sessionStorage.getItem(STORE_KEY) === "1") api.owner = true; } catch (e) {}

  if (typeof firebase === "undefined" || !firebase.initializeApp) {
    console.warn("[NWSDB] Firebase SDK not loaded. Running in local-only mode.");
    return;
  }
  try { firebase.initializeApp(CONFIG); } catch (e) {}
  var db = firebase.firestore();
  var docRef = db.collection(COLLECTION).doc(DOCTRIP);

  function serialize(data) {
    try { return JSON.stringify(data || {}); } catch (e) { return ""; }
  }

  // ---- Real-time reads (public) ----
  // Viewers receive every update. The organizer loads the initial cloud copy
  // once, then keeps their own local state (so their edits are never clobbered
  // by echoes of their own saves).
  api.subscribe = function (cb) {
    var first = true;
    return docRef.onSnapshot(function (snap) {
      api.ready = true;
      if (!snap.exists) { first = false; return; }
      var data = snap.data() || {};
      delete data.updatedAt;
      delete data.updatedBy;
      api.lastJSON = serialize(data);
      if (api.owner && !first) { first = false; return; }
      first = false;
      cb(data);
    }, function (err) {
      console.warn("[NWSDB] snapshot error:", err && err.message);
    });
  };

  // ---- Writes (only from organizer UI) ----
  var saveTimer = null;
  api.save = function (data) {
    if (!api.owner || !api.ready) return;
    var core = {
      trip: data.trip || null,
      fees: data.fees || null,
      participants: data.participants || [],
      payments: data.payments || [],
      budget: data.budget || [],
      expenses: data.expenses || [],
      logistics: data.logistics || []
    };
    var cmp = serialize(core);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (cmp === api.lastJSON) return;
    saveTimer = setTimeout(function () {
      api.lastJSON = cmp;
      saveTimer = null;
      var payload = Object.assign({}, core, { updatedAt: new Date().toISOString() });
      docRef.set(payload, { merge: false }).catch(function (e) {
        console.warn("[NWSDB] save error:", e && e.message);
      });
    }, 700);
  };

  api.signOut = function () {
    api.owner = false;
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
  };

  // ---- SHA-256 (browser) ----
  function sha256hex(str) {
    if (window.crypto && window.crypto.subtle) {
      var buf = new TextEncoder().encode(str);
      return window.crypto.subtle.digest("SHA-256", buf).then(function (h) {
        return Array.prototype.map.call(new Uint8Array(h), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    return Promise.resolve(null); // fallback: cannot verify
  }

  api.ownerLogin = function () {
    return new Promise(function (resolve) {
      if (api.owner) { resolve(true); return; }
      showPassModal(resolve);
    });
  };

  function unlock(resolve) {
    api.owner = true;
    try { sessionStorage.setItem(STORE_KEY, "1"); } catch (e) {}
    resolve(true);
  }

  function showPassModal(resolve) {
    if (document.getElementById("__nwsdb_login")) return;

    var wrap = document.createElement("div");
    wrap.id = "__nwsdb_login";
    wrap.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;";

    var card = document.createElement("div");
    card.style.cssText = "background:#fff;border-radius:16px;padding:22px;width:330px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.35);";
    card.innerHTML =
      '<div style="font-weight:800;font-size:16px;color:#0f172a;margin-bottom:2px;">සංවිධායක පිවිසුම</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:14px;">Organizer login - to edit the shared data</div>' +
      '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Passcode</label>' +
      '<input id="__nwsdb_pw" type="password" autocomplete="off" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;box-sizing:border-box;" />' +
      '<div id="__nwsdb_msg" style="font-size:12px;color:#dc2626;min-height:16px;margin-top:8px;"></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button id="__nwsdb_cancel" type="button" style="flex:1;padding:11px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:700;font-size:13px;cursor:pointer;">Cancel</button>' +
      '<button id="__nwsdb_ok" type="button" style="flex:1.4;padding:11px;border-radius:10px;border:0;background:#0f3d2e;color:#fff;font-weight:800;font-size:13px;cursor:pointer;">Login</button>' +
      "</div>";

    wrap.appendChild(card);
    document.body.appendChild(wrap);

    var pwEl = card.querySelector("#__nwsdb_pw");
    var msgEl = card.querySelector("#__nwsdb_msg");
    var okEl = card.querySelector("#__nwsdb_ok");

    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    function submit() {
      var pw = pwEl.value;
      if (!pw) { msgEl.textContent = "Passcode ඇතුළත් කරන්න"; return; }
      okEl.disabled = true; okEl.textContent = "Checking..."; msgEl.textContent = "";
      sha256hex(pw).then(function (h) {
        okEl.disabled = false; okEl.textContent = "Login";
        if (h && h === PASS_HASH) { close(); unlock(resolve); }
        else { msgEl.textContent = "වැරදි passcode - නැවත උත්සාහ කරන්න"; pwEl.value = ""; pwEl.focus(); }
      });
    }
    okEl.addEventListener("click", submit);
    pwEl.addEventListener("keydown", function (ev) { if (ev.key === "Enter") submit(); });
    card.querySelector("#__nwsdb_cancel").addEventListener("click", function () { close(); resolve(false); });
    setTimeout(function () { pwEl.focus(); }, 50);
  }
})();
