/* ============================================================
   driver.js — Driver panel logic
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let isTracking = false;
let watchId    = null;
let gpsCount   = 0;
let selBus     = '';
let selTrip    = '';
let gpsBuffer  = [];

// ── Clock ────────────────────────────────────────────────────
setInterval(() => {
  const n = new Date();
  document.getElementById('clock').innerText =
    String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
}, 1000);

// ── Keep GPS alive ───────────────────────────────────────────
setInterval(() => {
  if (isTracking && !watchId) {
    startTracking();
  }
}, 5000);

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
  document.getElementById('nextStop').innerText = stops[stops.length - 1] || '—';

  document.getElementById('routeList').innerHTML = stops.map((name, i) => `
    <div class="rstop" id="stop-${i}">
      <div class="sdot ${i === 0 ? 'cur' : ''}"></div>
      <div class="sname">${name}</div>
      <div class="sstatus ${i === 0 ? 'here' : ''}">${i === 0 ? '● Here' : 'Upcoming'}</div>
    </div>
  `).join('');

  document.getElementById('shareLink').innerText =
    `${window.location.origin}/index.html?bus=${selBus}`;
}

// ── Toggle GPS tracking ──────────────────────────────────────
function toggleTracking() {
  if (!selBus)  { alert('Please select your bus first!');   return; }
  if (!selTrip) { alert('Please select your shift first!'); return; }
  isTracking ? stopTracking() : startTracking();
}

// ── Wake Lock ────────────────────────────────────────────────
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

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

window.addEventListener('focus', async () => {
  await requestWakeLock();
});

// ── GPS Smoothing ─────────────────────────────────────────────
function getSmoothedLocation(lat, lng) {
  gpsBuffer.push({ lat, lng });
  if (gpsBuffer.length > 2) gpsBuffer.shift();
  const smoothLat = gpsBuffer.reduce((a, b) => a + b.lat, 0) / gpsBuffer.length;
  const smoothLng = gpsBuffer.reduce((a, b) => a + b.lng, 0) / gpsBuffer.length;
  return { lat: smoothLat, lng: smoothLng };
}

// ── Start sharing GPS ────────────────────────────────────────
function startTracking() {
  isTracking = true;
  gpsBuffer  = [];

  document.getElementById('bigCircle').classList.add('live');
  document.getElementById('ctext').innerText  = 'SHARING LIVE';
  document.getElementById('badge').classList.add('live');
  document.getElementById('bdot').classList.add('live');
  document.getElementById('btext').innerText  = 'Location LIVE';

  requestWakeLock();

  db.ref('liveLocation/' + selBus).onDisconnect().remove();

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: rawLat, longitude: rawLng, heading, speed, accuracy } = pos.coords;

      // Show accuracy — never block GPS
      if (accuracy > 100) {
        document.getElementById('gpsVal').innerText =
          '⚠️ GPS: ' + Math.round(accuracy) + 'm — Move outdoors for better accuracy';
      } else {
        document.getElementById('gpsVal').innerText =
          '✅ GPS: ' + Math.round(accuracy) + 'm — ' + rawLat.toFixed(5) + ', ' + rawLng.toFixed(5);
      }

      gpsCount++;
      document.getElementById('gpsCount').innerText = gpsCount;

      // Smooth GPS readings
      const { lat, lng } = getSmoothedLocation(rawLat, rawLng);

      // Calculate which stop has been passed
      const stops = ROUTE_STOPS[selBus] || [];
      let passedIndex = 0;
      stops.forEach((stopName, i) => {
        const coord = STOP_COORDS[stopName];
        if (!coord) return;
        const dist = getDistance(lat, lng, coord.lat, coord.lng);
        if (dist < 0.3) passedIndex = i + 1;
      });

      // Update driver panel stop progress
      updateStopProgress(passedIndex);

      // Send to Firebase
      db.ref('liveLocation/' + selBus).set({
        lat,
        lng,
        heading:   heading   || 0,
        speed:     speed     || 0,
        accuracy:  accuracy,
        trip:      selTrip,
        stopIndex: passedIndex,
        updatedAt: Date.now(),
      });
    },
    err => {
      document.getElementById('gpsVal').innerText = 'GPS Error: ' + err.message;
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// ── Stop sharing GPS ─────────────────────────────────────────
function stopTracking() {
  isTracking = false;
  gpsBuffer  = [];

  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

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

// ── Update stop progress ─────────────────────────────────────
function updateStopProgress(currentIndex) {
  const stops = ROUTE_STOPS[selBus] || [];
  stops.forEach((name, i) => {
    const dot    = document.querySelector(`#stop-${i} .sdot`);
    const status = document.querySelector(`#stop-${i} .sstatus`);
    if (!dot || !status) return;

    if (i < currentIndex) {
      dot.style.background = '#f59e0b';
      status.innerText     = '✓ Passed';
      status.style.color   = '#f59e0b';
    } else if (i === currentIndex) {
      dot.style.background = '#1a73e8';
      status.innerText     = '● Here';
      status.style.color   = '#1a73e8';
    } else {
      dot.style.background = '#ccc';
      status.innerText     = 'Upcoming';
      status.style.color   = '#888';
    }
  });
}