# The Kingdom Journey — Study Hub (v3)

Good evening, friends. One static page (`index.html`) + Firebase Auth/Firestore (project `kingdom-journey`).

**Deploy:** any static host. Vercel: import this repo, no build step, output = root. Firebase: `firebase deploy`.
**Firestore rules:** paste `firestore.rules` into Firebase Console → Firestore → Rules (or `firebase deploy --only firestore:rules`).
**Auth:** add the site's domain to Firebase Console → Authentication → Settings → Authorized domains.

**Weekly rhythm:** add `content/weekNN.json`, raise `currentWeek` in `content/config.json`, push.
**Short links:** `/yt /tt /ig /fb /tw /th /live` → edit in `vercel.json` (Vercel) and `firebase.json` (Firebase) plus `LINKS` at the top of `index.html`.
**Admins:** `ADMINS` in `index.html` and `isAdmin()` in `firestore.rules`.
