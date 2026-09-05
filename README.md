# SafaaiWala 2.0

A vernacular, low-literacy, offline-tolerant platform connecting informal
e-waste collectors to India's formal, CPCB-EPR-authorized recycling chain —
built for SIH26229 (Kabadiwala Connect) / the MoEFCC e-waste PS.

Team: Bin It Queens (Saloni Chaudhary, Vanshika, Shivani Mishra, Sanskriti)
— Indira Gandhi Delhi Technical University for Women

---

## Scope: national, not city-limited

The app resolves a collector's real GPS location to the nearest seeded
e-waste hub, so it works anywhere in India — it isn't hardcoded to one
city. **Currently seeded with 8 major hubs**: Delhi, Mumbai, Bengaluru,
Chennai, Kolkata, Hyderabad, Pune, and Ahmedabad. The in-app "India pilot"
badge (tap it) shows the live list.

Adding a new city is a data change, not a code change — add rows to
`backend/data/recyclers.json` and `backend/data/prices.json` with the new
city's name, and the pricing, matching, and ledger logic all pick it up
automatically. If a collector is near a city that isn't seeded yet, the
app gracefully falls back to the nearest available hub's pricing rather
than failing, and clearly flags recommended recyclers as "outside usual
pickup area" when they're genuinely far away.

## What this is

Collectors tap or speak to log scrap materials, get an instant fair-price
estimate, get matched to the nearest authorized recycler, and complete a
traceable, hash-verified handover — all of it usable on an entry-level
Android phone with patchy connectivity, in Hindi or Marathi, with zero
reading required if you don't want it.

## Quick start

**Backend**
```bash
cd backend
npm install
npm start
# runs on http://localhost:4000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# runs on http://localhost:5173
```

Open `http://localhost:5173` on your phone (same wifi network, use your
machine's LAN IP instead of localhost) to test the real mobile experience,
including offline mode (turn off wifi mid-session and watch it queue).

## Project structure

```
backend/
  server.js            Express app, mounts all routes
  routes/               materials, price, recyclers, lots, transactions, ledger, assistant
  utils/
    classify.js          material classification (see AI/ML section below)
    match.js             haversine distance + recycler ranking
    anomaly.js            explainable z-score price anomaly check
    ragAssistant.js       retrieval + templated bilingual answers
  data/                  seed JSON — this IS the structured dataset the PS asks for

frontend/
  src/
    pages/                Home, Capture (the core wizard), Recyclers, Ledger, Assistant
    lib/
      api.js               backend client with offline fallback
      offlineQueue.js       localStorage write queue + sync-on-reconnect
      voice.js              Web Speech API wrapper (STT + TTS)
      i18n.js                en/hi/mr UI strings
    context/AppContext.jsx  language + demo collector identity + online status
```

## Dataset schemas (matches the PS's explicit requirements)

- **Material dataset** — `backend/data/materials.json`: category, bilingual
  labels, hazard flag, bilingual safety notes.
- **Price dataset** — `backend/data/prices.json`: material, city, date,
  buy/sell price, unit, across all 8 seeded hub cities — supports the trend
  query in `/api/price` and mild city-to-city price variation.
- **Recycler dataset** — `backend/data/recyclers.json`: 11 recyclers across
  8 cities, with name, geo-coordinates, city, materials accepted, a CPCB EPR
  authorization ID (the actual national authority under the E-Waste
  (Management) Rules 2022 — not a state-specific body, since EPR
  registration is centralized), offered rate, pickup availability, and
  service radius.
- **Transaction + traceability dataset** — `backend/data/transactions.json`:
  populated at runtime; each row carries a SHA-256 reference hash of the lot
  ID, parties, weight, price, and timestamp — tamper-evident without needing
  a blockchain.
- **Collector dataset** — `backend/data/collectors.json`: intentionally
  minimal (no name, no phone) per the PS's "avoid unnecessary personal
  information" requirement.

All datasets are real, structured, and queried live by the app — not a
static mock the code ignores.

## Where AI/ML and RAG actually sit — and what's a documented placeholder

Being upfront about this matters more than pretending everything is
production-grade AI. Here's exactly what's real vs. what to swap in:

| Feature | Current implementation | Production swap-in |
|---|---|---|
| Material classification | Tap-to-select (reliable, low-literacy friendly) + a heuristic confidence score when a photo is attached | AWS Rekognition Custom Labels or a SageMaker endpoint fine-tuned on labeled e-waste photos |
| Price/safety/recycler assistant | Real retrieval over the structured datasets + templated bilingual generation ("RAG-lite") — deterministic and works fully offline | Keep the same retrieval step, pass retrieved rows as context into AWS Bedrock/Claude for open-ended phrasing |
| Voice input/output | Browser Web Speech API (works today, zero cost, zero setup) | AWS Transcribe + Polly for more reliable hi-IN/mr-IN recognition in noisy field conditions |
| Anomaly detection | Simple, explainable z-score check against historical prices | Same approach at larger scale — deliberately not a black-box model, since this needs to be defensible in front of a judging panel and to a collector who got flagged |

Say this explicitly in your pitch. A judging panel trusts "here's what
works today and here's our AWS integration plan" far more than an
unverifiable claim of a trained model that doesn't exist yet.

## Unit economics (fill in with real field data)

`backend/routes/ledger.js` currently assumes collectors earn 72% of the
formal-recycler rate from a street kabadiwala (`INFORMAL_RATE_FRACTION`).
**Replace this with real numbers from your required field interviews** with
at least two working scrap collectors — the PS explicitly grades on this.

## What to demo live

1. Tap through Capture in Hindi: select battery → weight → see the
   safety warning → get instant value → see ranked recyclers by distance.
2. Switch to Marathi, ask the assistant by voice: "बॅटरी भाव" — hear it
   answer back in Marathi.
3. Turn off wifi, complete a handover anyway, show the "saved offline —
   will sync" state, then reconnect and show it flip to synced.
4. Open Ledger and show the real ₹ uplift vs. informal selling — this is
   the number that makes the social-impact case land.

## Known gaps to close before the national round

- Real field interviews with 2+ collectors (required by the PS) — pick
  whichever seeded city is easiest for your team to reach
- Real recycler partnerships/data beyond the 11 seeded here, and genuine
  CPCB EPR registration numbers rather than illustrative placeholders
- A single national `INFORMAL_RATE_FRACTION` in `ledger.js` currently
  approximates every city the same way — real informal-market rates vary
  by city and should be measured per-hub from field data over time
- Swap heuristic classification for a real Rekognition/SageMaker model if
  time allows — even a small demo model trained on ~50 photos per category
  would meaningfully strengthen the AI/ML story
