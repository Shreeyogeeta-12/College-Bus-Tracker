# 🚌 KLS GIT Bus Tracker

A real-time live bus tracking web app for **KLS Gogte Institute of Technology, Belagavi**.  
Students can see their bus on a live map, track its ETA, and know exactly when it's arriving.  
Drivers share their GPS location from their phone — no app install needed.

---

## 🗂️ Project Structure

```
College-Bus-Tracker/
├── index.html          → Student-facing tracker (the map students open)
├── driver.html         → Driver panel (what the bus driver opens on their phone)
├── manifest.json       → Makes the app installable as a PWA (like an app on phone)
├── sw.js               → Service Worker for offline support
│
├── css/
│   ├── common.css      → Shared styles (reset, fonts, animations)
│   ├── tracker.css     → Student map view styles
│   └── driver.css      → Driver panel styles
│
├── js/
│   ├── config.js       → Firebase setup + app-wide constants (single source of truth)
│   ├── utils.js        → Shared utility functions (Haversine distance, polyline decoder)
│   ├── tracker.js      → Student-facing map + ETA logic
│   ├── driver.js       → Driver panel GPS sharing logic
│   └── data/
│       ├── stops.js    → GPS coordinates for every bus stop in Belagavi
│       ├── routes.js   → Ordered stop list for each bus route
│       ├── shifts.js   → Bus listings grouped by shift/time
│       └── drivers.js  → Driver name + phone number per bus
│
├── README.md           → This file
└── CHANGES.md          → Changelog explaining code changes
```

---

## 📱 How It Works (Simple Explanation)

```
Driver's Phone (driver.html)
       │
       │  GPS location (lat, lng, speed, heading)
       ▼
  Firebase Realtime Database  ←──── Always in sync, like a live scoreboard
       │
       │  Streams updates every second
       ▼
Student's Browser (index.html)
       │
       │  Shows bus on map, calculates ETA
       ▼
    Leaflet Map + Ola Maps routing
```

1. **Driver** opens `driver.html` on their phone, selects their shift and bus, taps the big circle to start sharing GPS.
2. **Firebase** stores the live location data in the cloud (like a shared Google Sheet that updates instantly).
3. **Students** open `index.html`, select their shift and bus, and see the bus move on the map in real time.
4. **ETA** is calculated using real road distance from Ola Maps, scaled by the bus's actual GPS speed.

---

## 🛠️ Tech Stack

| Technology | What it does | Free? |
|---|---|---|
| [Leaflet.js](https://leafletjs.com/) | Interactive map in the browser | ✅ Yes |
| Google Maps tiles | The actual map imagery (roads, labels) | ✅ Free tier |
| [Firebase Realtime DB](https://firebase.google.com/) | Stores and syncs live GPS location | ✅ Free tier |
| [Ola Maps Directions API](https://maps.olakrutrim.com/) | Road distance, traffic-aware duration, route polyline | ✅ Free tier |
| Browser Geolocation API | Gets driver's GPS coordinates | ✅ Built into browser |
| Vercel | Hosts the website | ✅ Free tier |

---

## 🚀 How to Run Locally

You don't need Node.js or npm. This is a plain HTML project.

**Option 1 — Python (recommended, comes pre-installed on most computers):**
```bash
cd College-Bus-Tracker
python3 -m http.server 8080

# Student view → http://localhost:8080/index.html
# Driver panel → http://localhost:8080/driver.html
```

**Option 2 — VS Code Live Server extension:**
- Install the "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

> ⚠️ **Important:** You cannot just double-click the HTML files and open them directly (as `file://...`).  
> Firebase and GPS won't work without an HTTP server. Always use a local server.

---

## 🗺️ How the Map Works

### Stop Coordinates (`js/data/stops.js`)
Every bus stop in Belagavi has GPS coordinates stored in a single object:
```js
const STOP_COORDS = {
  "Channamma Circle": { lat: 15.8672, lng: 74.5116 },
  "KLS GIT":          { lat: 15.8164, lng: 74.4835 },
  // ...70+ stops
};
```
These are used to draw the blue dots on the map for each stop on a route.

### Route Stops (`js/data/routes.js`)
Each bus has an ordered list of stops, identified by a unique key:
```js
const ROUTE_STOPS = {
  "m730_b3": ["Surabhi Hotel", "LSA School", "Kanbargi", ..., "KLS GIT"],
  // ...52 routes
};
```

### Shift & Bus Keys
Each bus key combines shift code + bus number:
- `m730` = Morning 7:30 AM
- `m900` = Morning 9:00 AM
- `d130` = Drop 1:30 PM
- `d400` = Drop 4:00 PM
- `d515` = Drop 5:15 PM

Example: `d400_b5` = Drop at 4:00 PM, Bus 5

---

## 🔥 Firebase Setup

The app uses Firebase Realtime Database. Config is in `js/config.js` (shared by both pages):
```js
firebase.initializeApp({
  databaseURL: "https://college-bus-tracker-11fce-default-rtdb.firebaseio.com"
});
```

**Database structure:**
```
liveLocation/
  m730_b3/
    lat: 15.8672
    lng: 74.5116
    speed: 8.3         ← meters per second (from driver's GPS)
    heading: 142
    accuracy: 5.2
    trip: "morning730"
    updatedAt: 1716789012345
```

When a driver stops sharing, their entry is **deleted** from the database (bus goes offline).

---

## 📡 ETA Calculation

See [`CHANGES.md`](./CHANGES.md) for a detailed before/after explanation.

**Short version:**  
ETA = Ola Maps road duration × (Ola Maps assumed speed ÷ real bus GPS speed) × 1.10 buffer

This gives real-world ETA, not just a road-speed-limit estimate.

---

## 🧩 Adding a New Bus Route

All data lives in `js/data/` — you only need to edit those files, not the HTML.

1. **Add stop coordinates** (only if the stop is new) in `js/data/stops.js`:
   ```js
   "New Stop Name": { lat: 15.XXXX, lng: 74.XXXX },
   ```

2. **Add the route** in `js/data/routes.js`:
   ```js
   "m730_b15": ["Start Stop", "Middle Stop", ..., "KLS GIT"],
   ```

3. **Add the bus to the correct shift** in `js/data/shifts.js`:
   ```js
   morning730: [
     // ...existing buses...
     { id: "m730_b15", label: "New Area Name" },
   ],
   ```

4. **Add the driver's name & phone** in `js/data/drivers.js`:
   ```js
   "m730_b15": "Driver Name 📞 9XXXXXXXXX",
   ```

> The same data files are used by both `index.html` and `driver.html` — no duplication needed.

---

## 👥 Who Uses What

| Page | Used by | Device |
|---|---|---|
| `index.html` | Students | Phone or laptop |
| `driver.html` | Bus drivers | Phone (needs GPS) |

---

## 🐛 Known Issues / To-Do

- Driver panel route progress list always shows the first stop as "Here" — it doesn't auto-advance as the bus moves
- No authentication — any driver can accidentally select any bus
- Ola Maps API key is in client-side JS — fine for internal use, but should be a backend proxy for public apps

---

## 📄 License

Internal use — KLS Gogte Institute of Technology, Belagavi.
