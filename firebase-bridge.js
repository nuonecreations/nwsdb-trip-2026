/* NWSDB Trip 2026 - Firebase bridge
 * Adds: real Firestore cloud sync (shared + permanent data) and an
 * organizer-only login gate. Everyone can READ; only the organizer
 * (OWNER_EMAIL) can WRITE. Security is enforced by firestore.rules.
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
  var OWNER_EMAIL = "trip@nwsdb.lk";
  var COLLECTION = "trips";
  var DOCTRIP = "main";

  // Safe no-op API so the app still works if the SDK/network is unavailable.
  var api = {
    isOwner: function () { return api.owner === true; },
    isEditing: function () {
      var el = document.activeElement;
      return !!(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    },
    subscribe: function () { return function () {}; },
    save: function () {},
    ownerLogin: function () { return Promise.resolve(false); },
    signOut: function () {},
    owner: false,
    lastJSON: ""
  };
  window.__NWSDB = api;

  if (typeof firebase === "undefined" || !firebase.initializeApp) {
    console.warn("[NWSDB] Firebase SDK not loaded. Running in local-only mode.");
    return;
  }

  try {
    firebase.initializeApp(CONFIG);
  } catch (e) { /* already initialized */ }

  var auth = firebase.auth();
  var db = firebase.firestore();
  var docRef = db.collection(COLLECTION).doc(DOCTRIP);

  function isOwnerEmail(email) {
    return !!email && email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  }

  function serialize(data) {
    try { return JSON.stringify(data || {}); } catch (e) { return ""; }
  }

  auth.onAuthStateChanged(function (u) {
    api.owner = !!(u && isOwnerEmail(u.email));
  });

  // ---- Real-time reads (public) ----
  api.subscribe = function (cb) {
    return docRef.onSnapshot(function (snap) {
      if (!snap.exists) return;
      var data = snap.data() || {};
      delete data.updatedAt;
      delete data.updatedBy;
      api.lastJSON = serialize(data);
      cb(data);
    }, function (err) {
      console.warn("[NWSDB] snapshot error:", err && err.message);
    });
  };

  // ---- Owner-only writes (debounced, de-duplicated) ----
  var saveTimer = null;
  api.save = function (data) {
    if (!api.owner) return;
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
    if (cmp === api.lastJSON) return;            // nothing changed - avoid echo loop
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      api.lastJSON = cmp;
      var payload = Object.assign({}, core, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: (auth.currentUser && auth.currentUser.email) || OWNER_EMAIL
      });
      docRef.set(payload, { merge: false }).catch(function (e) {
        console.warn("[NWSDB] save error:", e && e.message);
      });
    }, 700);
  };

  api.signOut = function () {
    try { auth.signOut(); } catch (e) {}
  };

  // ---- Organizer login gate ----
  api.ownerLogin = function () {
    return new Promise(function (resolve) {
      var u = auth.currentUser;
      if (u && isOwnerEmail(u.email)) {
        api.owner = true;
        resolve(true);
        return;
      }
      showLoginModal(resolve);
    });
  };

  function showLoginModal(resolve) {
    if (document.getElementById("__nwsdb_login")) return;

    var wrap = document.createElement("div");
    wrap.id = "__nwsdb_login";
    wrap.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;";

    var card = document.createElement("div");
    card.style.cssText = "background:#fff;border-radius:16px;padding:22px;width:330px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.35);";

    card.innerHTML =
      '<div style="font-weight:800;font-size:16px;color:#0f172a;margin-bottom:2px;">සංවිධායක පිවිසුම</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:14px;">Organizer login - to edit the shared data</div>' +
      '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Email</label>' +
      '<input id="__nwsdb_email" type="email" readonly style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;background:#f8fafc;color:#334155;box-sizing:border-box;margin-bottom:12px;" />' +
      '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Password</label>' +
      '<input id="__nwsdb_pw" type="password" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;box-sizing:border-box;" />' +
      '<div id="__nwsdb_msg" style="font-size:12px;color:#dc2626;min-height:16px;margin-top:8px;"></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button id="__nwsdb_cancel" type="button" style="flex:1;padding:11px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:700;font-size:13px;cursor:pointer;">Cancel</button>' +
      '<button id="__nwsdb_ok" type="button" style="flex:1.4;padding:11px;border-radius:10px;border:0;background:#0f3d2e;color:#fff;font-weight:800;font-size:13px;cursor:pointer;">Login</button>' +
      "</div>";

    wrap.appendChild(card);
    document.body.appendChild(wrap);

    var emailEl = card.querySelector("#__nwsdb_email");
    var pwEl = card.querySelector("#__nwsdb_pw");
    var msgEl = card.querySelector("#__nwsdb_msg");
    var okEl = card.querySelector("#__nwsdb_ok");
    emailEl.value = OWNER_EMAIL;

    function close() {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    function submit() {
      var pw = pwEl.value;
      if (!pw) { msgEl.textContent = "Password ඇතුළත් කරන්න"; return; }
      okEl.disabled = true;
      okEl.textContent = "Checking...";
      msgEl.textContent = "";
      auth.signInWithEmailAndPassword(OWNER_EMAIL, pw).then(function (cred) {
        if (cred && cred.user && isOwnerEmail(cred.user.email)) {
          api.owner = true;
          close();
          resolve(true);
        } else {
          auth.signOut();
          okEl.disabled = false;
          okEl.textContent = "Login";
          msgEl.textContent = "මෙම ගිණුමට සංස්කරණ අවසර නැත";
        }
      }).catch(function (e) {
        okEl.disabled = false;
        okEl.textContent = "Login";
        var code = (e && e.code) || "";
        if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
          msgEl.textContent = "වැරදි password - නැවත උත්සාහ කරන්න";
        } else if (code === "auth/too-many-requests") {
          msgEl.textContent = "උත්සාහ ගණන වැඩි - පසුව උත්සාහ කරන්න";
        } else if (code === "auth/network-request-failed") {
          msgEl.textContent = "අන්තර්ජාල සම්බන්ධතාවය නැත";
        } else {
          msgEl.textContent = (e && e.message) || "Login failed";
        }
      });
    }

    okEl.addEventListener("click", submit);
    pwEl.addEventListener("keydown", function (ev) { if (ev.key === "Enter") submit(); });
    card.querySelector("#__nwsdb_cancel").addEventListener("click", function () { close(); resolve(false); });
    setTimeout(function () { pwEl.focus(); }, 50);
  }
})();
