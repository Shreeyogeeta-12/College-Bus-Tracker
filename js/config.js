/* ============================================================
   config.js — Single source of truth for Firebase + app constants
   Loaded first by both index.html and driver.html
   ============================================================ */

// Firebase Realtime Database — one config, used by both pages
firebase.initializeApp({
  databaseURL: "https://college-bus-tracker-11fce-default-rtdb.firebaseio.com"
});
const db = firebase.database();

// ── Location constants ────────────────────────────────────────
// KLS GIT campus pin shown on the student map
const CAMPUS_LOCATION = { lat: 15.8164, lng: 74.4835 };

// Map viewport restricted to Belagavi district
// Format: [[southWest lat, lng], [northEast lat, lng]]
const BELAGAVI_BOUNDS = [[15.4800, 74.1500], [16.2200, 74.8800]];

// ── Ola Maps API ─────────────────────────────────────────────
const OLA_MAPS_API_KEY = 's0OZq9XTSK6I8m2YxidijWQDa4JmxdgMCQvXglZo';

// ── ETA engine config ─────────────────────────────────────────
const SPEED_BUFFER_SIZE     = 5;           // how many GPS speed readings to average
const CITY_DEFAULT_SPEED_MS = 25 / 3.6;   // fallback when bus is stopped at signal (~6.94 m/s = 25 km/h)
const ETA_TRAFFIC_BUFFER    = 1.10;        // 10% buffer on top of raw ETA for real-world signals/stops
