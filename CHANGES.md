# 📋 CHANGES — KLS GIT Bus Tracker

This file documents what was changed, why it was changed, and how it works now.  
Written for fellow developers who are new to the codebase.

---

## Change #1 — Better ETA Calculation (GPS speed-based)

**Files changed:** `js/tracker.js`, `js/config.js`

---

### 🤔 What Was the Problem?

The ETA shown to students was calculated like this:

```
ETA = OSRM estimated travel time × 1.25
```

OSRM is an open-source routing engine. When you ask it *"how long from A to B?"*, it estimates based on **road speed limits** — not the actual speed of the bus right now.

**Example of why this fails:**  
Road speed limit is 60 km/h → OSRM says 4 minutes.  
But the bus is stuck in traffic doing 15 km/h → it'll actually take 16 minutes.  
The old flat 25% buffer doesn't help — it's a guess on top of a guess.

---

### ✅ What Does It Do Now?

The driver's phone already sends its real GPS speed to Firebase every second.  
The old code was ignoring that data. Now we use it.

**New formula:**
```
ETA = Ola Maps duration × (Ola Maps assumed speed ÷ real bus GPS speed) × 1.10
```

---

### 📐 How It Works Step by Step

#### Step 1 — Driver's phone sends speed
In `driver.html`, when the driver is sharing location, `js/driver.js` pushes to Firebase:
```js
db.ref('liveLocation/' + selBus).set({
  lat, lng,
  speed: pos.coords.speed || 0,   // ← real GPS speed in meters per second (m/s)
  heading, accuracy, trip, updatedAt: Date.now(),
});
```

#### Step 2 — Student page collects recent speed readings
In `js/tracker.js`, every Firebase update:
```js
const rawSpeed = (typeof data.speed === 'number' && data.speed > 0.5) ? data.speed : null;
if (rawSpeed !== null) {
  speedHistory.push(rawSpeed);
  if (speedHistory.length > SPEED_BUFFER_SIZE) speedHistory.shift(); // keep last 5
}
```
We average the last 5 readings to smooth GPS noise (like how a speedometer smooths jerky sensor data).

#### Step 3 — Scale Ola Maps duration by real speed ratio
```js
const avgSpeedMs = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
const validSpeed = avgSpeedMs > 0.5 ? avgSpeedMs : CITY_DEFAULT_SPEED_MS;  // fallback: 25 km/h
const olaSpeedMs = roadDistanceMeters / olaDuration;  // speed Ola Maps assumed
const ratio      = olaSpeedMs / validSpeed;           // how much faster/slower than real
etaSeconds       = olaDuration * ratio * ETA_TRAFFIC_BUFFER;  // scale + 10% buffer
```

If Ola Maps assumed the bus goes 40 km/h but real GPS shows 20 km/h, we double the duration.  
If the bus is going faster than Ola assumed, we shorten it.

#### Step 4 — Show "Bus may be stopped" if not moving
```js
const isStopped = speedHistory.length >= 3 && speedHistory.every(s => s < 0.5);

document.getElementById('etaTime').innerText = isStopped ? '~' + etaMinutes : etaMinutes;
document.getElementById('etaDist').innerText = isStopped
  ? `${roadDistanceKm} km — Bus may be stopped`
  : `${roadDistanceKm} km away`;
```

---

### 📊 Before vs After

| | Before | After |
|---|---|---|
| **Speed used for ETA** | Road speed limit (OSRM guess) ❌ | Real GPS speed of the bus ✅ |
| **Traffic awareness** | Flat 25% buffer ❌ | Dynamic ratio — slow bus = longer ETA ✅ |
| **Stopped bus** | Shows wrong ETA as if moving ❌ | Shows `~X min — Bus may be stopped` ✅ |
| **Speed noise** | Not handled | Rolling average of 5 readings ✅ |

---

## Change #2 — Folder Refactoring (DRY / SOLID)

**Files changed:** Everything restructured

---

### 🤔 What Was the Problem?

All code — HTML, CSS, JS logic, stop coordinates, route lists, driver names — was crammed into two giant files (`index.html` and `driver.html`).

Problems this caused:
- Stop coordinates were duplicated in both files → one update needed in two places
- Route lists were duplicated → same story
- CSS was inline → impossible to maintain
- 600+ line HTML files → hard to navigate
- Any new bus route required editing both HTML files

---

### ✅ What Was Done

Extracted everything into purpose-specific files:

| File | What it holds |
|---|---|
| `js/config.js` | Firebase init + all app constants (one place to change them) |
| `js/utils.js` | Reusable functions: `getDistance()`, `decodePolyline()` |
| `js/tracker.js` | All student map + ETA logic |
| `js/driver.js` | All driver panel GPS sharing logic |
| `js/data/stops.js` | GPS coordinates for every stop — shared by both pages |
| `js/data/routes.js` | Ordered stop list per bus — shared by both pages |
| `js/data/shifts.js` | Bus listings per shift — shared by both pages |
| `js/data/drivers.js` | Driver name + phone per bus |
| `css/common.css` | Shared reset + font styles |
| `css/tracker.css` | Student map styles only |
| `css/driver.css` | Driver panel styles only |

**Result:** Both `index.html` and `driver.html` are now thin HTML shells that just load these files in the right order. Adding a new bus route means editing only the `js/data/` files — once, not twice.

---

## Change #3 — Replaced OSRM with Ola Maps Directions API

**File changed:** `js/tracker.js` (`processRoadETA` function), `js/config.js`, `js/utils.js`

---

### 🤔 What Was the Problem?

OSRM (Open Source Routing Machine) is a free public routing server. It works, but:
- It runs on international servers with no knowledge of Indian traffic patterns
- Duration estimates are based on road speed limits, not real traffic
- Occasionally slow to respond

---

### ✅ What Was Done

Replaced OSRM with the **Ola Maps Directions API** — the same routing engine used internally by Ola/Uber for Indian roads.

**API call (in `processRoadETA`):**
```js
const response = await fetch(
  `https://api.olamaps.io/routing/v1/directions` +
  `?origin=${driverLat},${driverLng}` +
  `&destination=${destCoord.lat},${destCoord.lng}` +
  `&overview=full` +
  `&api_key=${OLA_MAPS_API_KEY}`,
  { method: 'POST' }
);
```

**Key differences from OSRM:**

| | OSRM | Ola Maps |
|---|---|---|
| Traffic awareness | ❌ Speed limits only | ✅ Real Indian traffic data |
| Response: distance | `route.distance` (metres) | `legs[0].distance` (plain number, metres) |
| Response: duration | `route.duration` (seconds) | `legs[0].duration` (plain number, seconds) |
| Response: polyline | GeoJSON coordinates array | Google encoded polyline string |

**Polyline decoder added to `js/utils.js`:**  
Ola Maps returns the route path as a Google encoded polyline string. Leaflet needs `[[lat, lng], ...]` pairs, so a decoder was added:
```js
function decodePolyline(encoded) { /* standard Google polyline decoder */ }
```

**Actual Ola Maps response shape** (confirmed from live API):
```json
{
  "status": "SUCCESS",
  "routes": [{
    "legs": [{
      "distance": 640,    ← plain number (metres)
      "duration": 122     ← plain number (seconds, traffic-aware)
    }],
    "overview_polyline": "{~}_Bm}}eMMpBa@..."  ← plain string, not { points: "..." }
  }]
}
```

The parsing in `tracker.js` handles both formats defensively:
```js
const leg = json.routes[0].legs.find(l => l != null);
const roadDistanceMeters = leg.distance?.value ?? (typeof leg.distance === 'number' ? leg.distance : 0);
const olaDuration        = leg.duration?.value ?? (typeof leg.duration === 'number' ? leg.duration : 0);

const encodedPoly = typeof json.routes[0].overview_polyline === 'string'
  ? json.routes[0].overview_polyline
  : json.routes[0].overview_polyline.points;
const routeCoords = decodePolyline(encodedPoly);
```

---

*Last updated: May 2026*
