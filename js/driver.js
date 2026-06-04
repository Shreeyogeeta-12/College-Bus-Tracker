/* ============================================================
   driver.js — Driver panel logic
   Depends on (loaded before this file):
     config.js       → db
     data/routes.js  → ROUTE_STOPS
     data/shifts.js  → SHIFT_BUSES
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let isTracking = false;
let watchId    = null;
let gpsCount   = 0;
let selBus     = '';
let selTrip    = '';

// ── Clock ────────────────────────────────────────────────────
setInterval(() => {
  const n = new Date();
  document.getElementById('clock').innerText =
    String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
}, 1000);

// ── Shift change → populate bus dropdown ─────────────────────
function onTripChange() {
  selTrip = document.getElementById('tripSelect').value;
  selBus  = '';
  if (isTracking) stopTracking();

  const busSelect = document.getElementById('busSelect');
  busSelect.innerHTML = '<option value="">— Select your bus —</option>';
  if (!selTrip) return;

  (SHIFT_BUSES[selTrip] || []).forEach(b => {
    const opt       = document.createElement('option');
    opt.value       = b.id;
    opt.textContent = b.label;
    busSelect.appendChild(opt);
  });

  document.getElementById('routeList').innerHTML =
    '<p style="color:#888888;font-size:0.85rem">Select your bus to see route</p>';
  document.getElementById('nextStop').innerText  = '—';
  document.getElementById('shareLink').innerText = 'Select a bus to generate link';
}

// ── Bus change → show route list + share link ────────────────
function onBusChange() {
  selBus = document.getElementById('busSelect').value;
  if (!selBus || !selTrip) return;

  const stops = ROUTE_STOPS[selBus] || [];

  // Last stop is the final destination
  document.getElementById('nextStop').innerText = stops[stops.length - 1] || '—';

  // Build route progress list
document.getElementById('routeList').innerHTML = stops.map((name, i) => `
    <div class="rstop" id="stop-${i}">
      <div class="sdot ${i === 0 ? 'cur' : ''}"></div>
      <div class="sname">${name}</div>
      <div class="sstatus ${i === 0 ? 'here' : ''}">${i === 0 ? '● Here' : 'Upcoming'}</div>
    </div>
  `).join('');

  // Share link for students
  document.getElementById('shareLink').innerText =
    `${window.location.origin}/index.html?bus=${selBus}`;
}

// ── Toggle GPS tracking ──────────────────────────────────────
function toggleTracking() {
  if (!selBus)  { alert('Please select your bus first!');   return; }
  if (!selTrip) { alert('Please select your shift first!'); return; }
  isTracking ? stopTracking() : startTracking();
}

// ── Start sharing GPS to Firebase ───────────────────────────
function startTracking() {
  isTracking = true;
  document.getElementById('bigCircle').classList.add('live');
  document.getElementById('ctext').innerText  = 'SHARING LIVE';
  document.getElementById('badge').classList.add('live');
  document.getElementById('bdot').classList.add('live');
  document.getElementById('btext').innerText  = 'Location LIVE';

  // Keep screen awake while sharing
  // Keep screen awake while sharing
let wakeLock = null;
async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      requestWakeLock();
    });
  } catch (err) {
    console.log('Wake lock failed:', err);
  }
}
requestWakeLock();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    requestWakeLock();
  }
});
  db.ref('liveLocation/' + selBus).onDisconnect().remove();
  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: lat, longitude: lng, heading, speed, accuracy } = pos.coords;
      gpsCount++;
      const stops = ROUTE_STOPS[selBus] || [];
      let currentStopIndex = 0;
      stops.forEach((stopName, i) => {
        const coord = STOP_COORDS[stopName];
        if (!coord) return;
        const dist = getDistance(lat, lng, coord.lat, coord.lng);
        if (dist < 0.3) currentStopIndex = i + 1;
     });
     updateStopProgress(currentStopIndex);

      db.ref('liveLocation/' + selBus).set({
        lat,
        lng,
        heading:   heading  || 0,
        speed:     speed    || 0,   // m/s — used by tracker.js for real ETA
        accuracy:  accuracy,
        trip:      selTrip,
        updatedAt: Date.now(),
      });

      document.getElementById('gpsCount').innerText = gpsCount;
      document.getElementById('gpsVal').innerText   = lat.toFixed(5) + ', ' + lng.toFixed(5);
    },
    err => {
      document.getElementById('gpsVal').innerText = 'GPS Error: ' + err.message;
    },
    { enableHighAccuracy: true, maximumAge: 0 }
  );
}

// ── Stop sharing GPS ─────────────────────────────────────────
function stopTracking() {
  isTracking = false;
  if (watchId) navigator.geolocation.clearWatch(watchId);

  // Remove from Firebase so students see bus as offline
  db.ref('liveLocation/' + selBus).remove();

  document.getElementById('bigCircle').classList.remove('live');
  document.getElementById('ctext').innerText   = 'TAP TO SHARE';
  document.getElementById('badge').classList.remove('live');
  document.getElementById('bdot').classList.remove('live');
  document.getElementById('btext').innerText   = 'Location OFF';
  document.getElementById('gpsVal').innerText  = 'Not sharing';
  gpsCount = 0;
  document.getElementById('gpsCount').innerText = '0';
}
function updateStopProgress(currentIndex) {
  const stops = ROUTE_STOPS[selBus] || [];
  stops.forEach((name, i) => {
    const dot = document.querySelector(`#stop-${i} .sdot`);
    const status = document.querySelector(`#stop-${i} .sstatus`);
    if (!dot || !status) return;

    if (i < currentIndex) {
      dot.style.background = '#f59e0b';
      status.innerText = '✓ Passed';
      status.style.color = '#f59e0b';
    } else if (i === currentIndex) {
      dot.style.background = '#1a73e8';
      status.innerText = '● Here';
      status.style.color = '#1a73e8';
    } else {
      dot.style.background = '#ccc';
      status.innerText = 'Upcoming';
      status.style.color = '#888';
    }
  });
}
