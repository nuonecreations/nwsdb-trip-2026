# නුවරඑළිය Trip 2026 - NWSDB Friends Club

## Live URLs
- Firebase Hosting: https://nwsdb-trip-2026.web.app
- GitHub Pages: https://nuonecreations.github.io/nwsdb-trip-2026/

## කොහොමද වැඩ කරන්නේ (How it works)
- දත්ත Firestore (`trips/main`) එකේ තියෙනවා - හැමෝටම **shared + permanent**.
- පිවිසෙන හැම කෙනෙකුටම දත්ත **බලන්න පමණයි** (view-only).
- සංවිධායකයා විතරයි සංස්කරණය කරන්න පුළුවන් - header එකේ **"Login as Owner"** → passcode එක ඇතුළත් කරන්න.

## Organization login
- Passcode: `1235@com`
- Passcode එක වෙනස් කරන්න:
  1. අලුත් passcode එකක් සඳහා hash එක හදන්න:
     `node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSCODE').digest('hex'))"`
  2. එම hash එක `firebase/public/firebase-bridge.js` හි `PASS_HASH = "..."` එකට දාන්න.
  3. නැවත deploy කරන්න (පහළ බලන්න).

## Project details
- Firebase project: `nwsdb-trip-2026` (Spark / no-card plan)
- Firestore region: `asia-south1` (Mumbai)
- Data document: `trips/main`
- Rules: `firebase/firestore.rules` (anyone reads, app writes through the passcode gate)

## Deploy කරන හැටි
```
cd firebase
firebase deploy --only hosting,firestore:rules --project nwsdb-trip-2026
```
GitHub Pages සඳහා `github-pages/index.html` සහ `firebase/public/firebase-bridge.js` repo එකට push කරන්න.

## Security note (වැදගත්)
මෙය **නොමිලේ (no-card)** කරන්න ඕන නිසා, organizer passcode එක browser එකේ (client-side)
පරීක්ෂා වෙනවා. දක්ෂ තාක්ෂණික කෙනෙකුට එය bypass කරන්න පුළුවන්. ඒ නිසා මෙහි ඉතා
සංවේදී (sensitive) දත්ත තබන්න එපා. Firebase Auth (billing linked) භාවිතා කළොත්
මෙය server-side එකෙන් සම්පූර්ණයෙන්ම secure කරන්න පුළුවන්.

## PDF Export / CSV
Dashboard එකේ PDF Export button එකෙන් report එක download වෙනවා (jsPDF).
