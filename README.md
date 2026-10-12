[README.md](https://github.com/user-attachments/files/33319683/README.md)
# නුවරඑළිය Trip 2026 - නොමිලේ Deploy කරන හැටි

## Option 1: Firebase Free (Spark Plan) - 100% නොමිලේ
Firebase Spark plan එක සම්පූර්ණයෙන්ම නොමිලේ, credit card එකක්වත් ඕන නෑ!

Free Limits (ඔබේ Trip එකට ඇතිවෙන්නත් වඩා වැඩියි):
- Hosting: 10GB storage, 360MB/day transfer - FREE
- Firestore: 1GB storage, 50k reads/day, 20k writes/day - FREE  
- Auth: Unlimited Google logins - FREE

Deploy Steps:
1. firebase.google.com -> Console -> Add project
2. Billing plan එක Spark (No-cost) තෝරන්න - කිසිම අය කිරීමක් නෑ!
3. Authentication -> Google enable
4. Firestore -> Create database -> Test mode
5. Hosting -> Get started
6. firebase-tools install:
   npm install -g firebase-tools
   firebase login
   firebase init (Hosting + Firestore තෝරන්න)
   firebase deploy

ඔබේ link එක: https://YOUR_PROJECT.web.app

## Option 2: GitHub Pages - 100% නොමිලේ (මම නිර්දේශ කරන ලේසිම එක)

1. github.com -> New repository -> nwsdb-trip-2026
2. Add file -> Upload files -> මේ folder එකේ තියෙන index.html upload කරන්න
3. Settings -> Pages -> Source: Deploy from branch -> main -> /root -> Save
4. විනාඩි 2න් link එක: https://YOUR_USERNAME.github.io/nwsdb-trip-2026/

මේක සම්පූර්ණයෙන්ම නොමිලේ, කිසිම card එකක් ඕන නෑ, lifetime free!

Real-time sync ඕන නම්:
- Frontend GitHub Pages එකේ (free)
- Backend Firestore free tier එකේ (free)
- දෙකම free!

## View-only Share කරන හැටි
- GitHub Pages link එක හැමෝටම දෙන්න - ඔවුන්ට view-only
- ඔබ Edit කරන්න: /admin?edit=true වගේ secret param එකකින් හෝ login එකකින්

## PDF Export
Dashboard එකේ PDF Export button එකෙන් report එක download වෙනවා - jsPDF වලින්, print නෙවෙයි.
