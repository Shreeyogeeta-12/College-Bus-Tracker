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
const BELAGAVI_BOUNDS = [[15.7800, 74.4000], [15.9000, 74.6000]];

// ── Ola Maps API ─────────────────────────────────────────────
const OLA_MAPS_API_KEY = 's0OZq9XTSK6I8m2YxidijWQDa4JmxdgMCQvXglZo';
const SHIFT_END_CLEANUP_HOURS = 1;
// ── ETA engine config ─────────────────────────────────────────
const SPEED_BUFFER_SIZE     = 10;           // how many GPS speed readings to average
const CITY_DEFAULT_SPEED_MS = 25 / 3.6;   // fallback when bus is stopped at signal (~6.94 m/s = 25 km/h)
const ETA_TRAFFIC_BUFFER    = 1.10;        // 10% buffer on top of raw ETA for real-world signals/stops
// ── Driver database ───────────────────────────────────────────
const DRIVER_DB = {
  m730_b1:  "Driver 1",  m730_b2:  "Driver 2",  m730_b3:  "Driver 3",
  m730_b4:  "Driver 4",  m730_b5:  "Driver 5",  m730_b6:  "Driver 6",
  m730_b7:  "Driver 7",  m730_b8:  "Driver 8",  m730_b9:  "Driver 9",
  m730_b10: "Driver 10", m730_b11: "Driver 11", m730_b12: "Driver 12",
  m730_b13: "Driver 13", m730_b14: "Driver 14",
  m900_b1:  "Driver 1",  m900_b2:  "Driver 2",  m900_b3:  "Driver 3",
  m900_b4:  "Driver 4",  m900_b5:  "Driver 5",  m900_b6:  "Driver 6",
  m900_b7:  "Driver 7",  m900_b8:  "Driver 8",  m900_b9:  "Driver 9",
  m900_b10: "Driver 10", m900_b11: "Driver 11", m900_b12: "Driver 12",
  m900_b13: "Driver 13", m900_b14: "Driver 14",
  d130_b1:  "Driver 1",  d130_b2:  "Driver 2",  d130_b3:  "Driver 3",
  d130_b4:  "Driver 4",  d130_b5:  "Driver 5",  d130_b6:  "Driver 6",
  d130_b7:  "Driver 7",  d130_b8:  "Driver 8",  d130_b9:  "Driver 9",
  d400_b1:  "Driver 1",  d400_b2:  "Driver 2",  d400_b3:  "Driver 3",
  d400_b4:  "Driver 4",  d400_b5:  "Driver 5",  d400_b6:  "Driver 6",
  d400_b7:  "Driver 7",  d400_b8:  "Driver 8",
  d515_b1:  "Driver 1",  d515_b2:  "Driver 2",  d515_b3:  "Driver 3",
  d515_b4:  "Driver 4",  d515_b5:  "Driver 5",  d515_b6:  "Driver 6",
  d515_b7:  "Driver 7",  d515_b8:  "Driver 8",  d515_b9:  "Driver 9",
  d515_b10: "Driver 10", d515_b11: "Driver 11",
};