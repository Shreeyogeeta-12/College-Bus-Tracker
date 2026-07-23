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
    startWatching();
  }
}, 3000);

// ── Shift change ─────────────────────────────────────────────
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

// ── Bus change ───────────────────────────────────────────────
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

// ── Toggle tracking ──────────────────────────────────────────
function toggleTracking() {
  if (!selBus)  { alert('Please select your bus first!');   return; }
  if (!selTrip) { alert('Please select your shift first!'); return; }
  isTracking ? stopTracking() : startTracking();
}

// ── Wake Lock ────────────────────────────────────────────────
let wakeLock = null;

async function requestWakeLock() {
  try {
    if (wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', async () => {
      wakeLock = null;
      if (isTracking) await requestWakeLock();
    });
  } catch (err) {
    console.log('WakeLock error:', err);
  }
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && isTracking) {
    await requestWakeLock();
    if (!watchId) startWatching();
  }
});

window.addEventListener('focus', async () => {
  if (isTracking) {
    await requestWakeLock();
    if (!watchId) startWatching();
  }
});

// ── GPS Smoothing ─────────────────────────────────────────────
function getSmoothedLocation(lat, lng) {
  gpsBuffer.push({ lat, lng });
  if (gpsBuffer.length > 2) gpsBuffer.shift();
  const smoothLat = gpsBuffer.reduce((a, b) => a + b.lat, 0) / gpsBuffer.length;
  const smoothLng = gpsBuffer.reduce((a, b) => a + b.lng, 0) / gpsBuffer.length;
  return { lat: smoothLat, lng: smoothLng };
}

// ── GPS Watcher (restartable) ────────────────────────────────
function startWatching() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: rawLat, longitude: rawLng, heading, speed, accuracy } = pos.coords;

      if (accuracy > 100) {
        document.getElementById('gpsVal').innerText =
          '⚠️ GPS: ' + Math.round(accuracy) + 'm — Move outdoors';
      } else {
        document.getElementById('gpsVal').innerText =
          '✅ GPS: ' + Math.round(accuracy) + 'm — ' +
          rawLat.toFixed(5) + ', ' + rawLng.toFixed(5);
      }

      gpsCount++;
      document.getElementById('gpsCount').innerText = gpsCount;

      const { lat, lng } = getSmoothedLocation(rawLat, rawLng);

      const stops = ROUTE_STOPS[selBus] || [];
      let passedIndex = 0;
      stops.forEach((stopName, i) => {
        const coord = STOP_COORDS[stopName];
        if (!coord) return;
        const dist = getDistance(lat, lng, coord.lat, coord.lng);
        if (dist < 0.3) passedIndex = i + 1;
      });

      updateStopProgress(passedIndex);

      db.ref('liveLocation/' + selBus).set({
        lat,
        lng,
        heading:   heading   || 0,
        speed:     speed     || 0,
        accuracy:  accuracy,
        trip:      selTrip,
        updatedAt: Date.now(),
      });
    },
    err => {
      document.getElementById('gpsVal').innerText = 'GPS Error: ' + err.message;
      watchId = null;
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// ── Start tracking ───────────────────────────────────────────
function startTracking() {
  isTracking = true;
  gpsBuffer  = [];
  gpsCount   = 0;

  document.getElementById('bigCircle').classList.add('live');
  document.getElementById('ctext').innerText    = 'SHARING LIVE';
  document.getElementById('badge').classList.add('live');
  document.getElementById('bdot').classList.add('live');
  document.getElementById('btext').innerText    = 'Location LIVE';
  document.getElementById('gpsCount').innerText = '0';

  requestWakeLock();
  db.ref('liveLocation/' + selBus).onDisconnect().remove();
  startWatching();
}

// ── Stop tracking ────────────────────────────────────────────
function stopTracking() {
  isTracking = false;
  gpsBuffer  = [];

  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }

  db.ref('liveLocation/' + selBus).remove();

  document.getElementById('bigCircle').classList.remove('live');
  document.getElementById('ctext').innerText    = 'TAP TO SHARE';
  document.getElementById('badge').classList.remove('live');
  document.getElementById('bdot').classList.remove('live');
  document.getElementById('btext').innerText    = 'Location OFF';
  document.getElementById('gpsVal').innerText   = 'Not sharing';
  document.getElementById('gpsCount').innerText = '0';
  gpsCount = 0;
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