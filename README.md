# goodeveningfriends.com — the front door of the channel (static site, Vercel)

Good evening, friends. Static HTML + Firebase Auth/Firestore (project `kingdom-journey`) for the Kingdom Journey companion.

**Pages:** `/` teaser front door · `/home` full landing (unlisted until launch) · `/series` · `/kingdom-journey` the companion (`kingdom-journey/index.html` + `kj.js` + `kj.css` + `trail3d.js` + `ambience.js`).
**Deploy:** Vercel, no build step, output = root; every commit to `main` deploys.
**Sign-in:** begins at goodeveningfriends.com — `vercel.json` proxies `/__/auth/*` to Firebase; `authDomain` in `firebase-config.js` is our domain.
**Firestore rules:** `firestore.rules` → Firebase Console → Firestore → Rules → Publish.
**Weekly rhythm:** add `content/weekNN.json`, raise `currentWeek` in `content/config.json`, push. Sealed titles ahead come from `content/trail.json`.
**The hour on the road:** `dawn.nightUntil` / `dawn.dayFrom` and `journeyComplete` in `content/config.json`.
**Admins:** root admins in `kj.js` (`ROOT_ADMINS`) and `firestore.rules`; more from Admin → Tools.
**Short links:** `/yt /tt /ig /fb /tw /th /live` → `vercel.json` + `LINKS` in `kj.js`.
**Old address:** `firebase.json` turns kingdom-journey.web.app into a redirect here (`firebase deploy --only hosting`).
