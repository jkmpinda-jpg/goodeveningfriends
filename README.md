# goodeveningfriends.com — the front door of the channel (static site, Vercel)

Good evening, friends. Static HTML + Firebase Auth/Firestore (project `kingdom-journey`) for the Kingdom Journey companion. Everything here is © Entreprises Royales Du Congo (see `/legal/`).

**Pages:** `/` teaser front door · `/home` full landing (unlisted until launch) · `/series` · `/family-tree/` the genealogy · `/legal/` terms, conduct, disclaimer, privacy · `/kingdom-journey` the companion (`kingdom-journey/index.html` + `kj.js` + `kj.css` + `social.js` + `trail3d.js` + `ambience.js`).
**Shared tabs:** `assets/sitenav.js` draws the same top tabs on every static page (Profile · The Trail · Series ▾ · The Family Tree · Bible ▾); the companion draws its own in `kj.js` with the same Series/Bible menus (`SERIES`, `BIBLE`).
**Deploy:** Vercel, no build step, output = root; every commit to `main` deploys.
**Sign-in:** begins at goodeveningfriends.com — `vercel.json` proxies `/__/auth/*` to Firebase; `authDomain` in `firebase-config.js` is our domain.
**Firestore rules:** `firestore.rules` → Firebase Console → Firestore → Rules → Publish (v6: rooms, live + chat + hands, bars, reports, settings/live + settings/speakers).
**Weekly rhythm:** add `content/weekNN.json`, raise `currentWeek` in `content/config.json`, push. Sealed titles ahead come from `content/trail.json`. A week carries: `parable.sections`, `trackA/trackB.sections` (labels `bible` / `out` / `msg` / `int`, `src` on outside sources), `quiz` (15 questions tagged `set: parable | A | B`), `flash` (25–50 cards with `cat: strongs | people | history | verse | image`), `images` (authentic pictures with credits), `snippets`, `poll`.
**Sources by week:** `#sources/N` renders a page per week from `content/weekNN.json` — `scripture` (per page: `main`/`also`), `messageAuthor` + `sermons` (`title`, `code`, `page`, `what` — every sermon the week's Message paragraphs stand on), the `src` of every outside-source section (author, work, year), and `images` (artist, collection, licence). Lesson pages keep the sources in the collapsed panel; `#credits` lists the weeks. Tagline everywhere: **1 King, 2 Kingdoms, Our story!** · descriptor: **Bible Studies · Scripture Breakdown**.
**Sharing a moment:** a YouTube link pasted in a room or the live chat becomes a ▶ chip at that second (`ytParse`/`linkify` in `social.js`); the Bars room takes a link to the moment; the how-to card sits under the house vocabulary.
**The hour on the road:** `dawn.nightUntil` / `dawn.dayFrom` and `journeyComplete` in `content/config.json`.
**Live:** Admin flips the Teacher's switch on the Live page (`settings/live`); the banner flashes on every page; chat lives in `live/{sid}/messages`; the speakers' line = a VDO.Ninja room link pasted into the switch, regular speakers in `settings/speakers`, hands in `live/{sid}/hands`.
**Community:** rooms in `rooms/{id}` (seeded by the first admin visit), messages with Bars! and the house vocabulary, member pictures screened in the browser (`assets/vendor/nsfwjs.min.js` + `tf.min.js` + `nsfw/`) and held for the teacher's approval.
**Admins:** root admins in `kj.js` (`ROOT_ADMINS`) and `firestore.rules`; more from Admin → Tools.
**Short links:** `/yt /tt /ig /fb /tw /th /live` → `vercel.json` + `LINKS` in `kj.js`.
**Old address:** `firebase.json` turns kingdom-journey.web.app into a redirect here (`firebase deploy --only hosting`).
