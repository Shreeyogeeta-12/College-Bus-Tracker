/* ============================================================
   driver.js — Driver panel logic
   ============================================================ */

let isTracking = false;
let watchId    = null;
let gpsCount   = 0;
let selBus     = '';
let selTrip    = '';
let gpsBuffer  = [];
let stopIndex  = 0;

const STOP_ARRIVAL_RADIUS_KM = 0.3;
const MAX_LOOKAHEAD = 4; // can catch up up to 4 stops ahead if GPS misses one — still strictly sequential, never jumps backward or skips the whole route

setInterval(() => {
  const n = new Date();
  document.getElementById('clock').innerText =
    String(n.getHours()).padStart(2,'0') + ':' +
    String(n.getMinutes()).padStart(2,'0');
}, 1000);

setInterval(() => {
  if (isTracking && !watchId) startWatching();
}, 3000);

function onTripChange() {
  selTrip = document.getElementById('tripSelect').value;
  selBus  = '';
  if (isTracking) stopTracking();
  const busSelect = document.getElementById('busSelect');
  busSelect.innerHTML = '<option value="">— Select your bus —</option>';
  if (!selTrip) return;
  (SHIFT_BUSES[selTrip] || []).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.label;
    busSelect.appendChild(opt);
  });
  document.getElementById('routeList').innerHTML =
    '<p style="color:#888;font-size:0.85rem">Select your bus to see route</p>';
  document.getElementById('nextStop').innerText  = '—';
  document.getElementById('shareLink').innerText = 'Select a bus to generate link';
}

function onBusChange() {
  if (isTracking) stopTracking();
  selBus = document.getElementById('busSelect').value;
  stopIndex = 0;
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

function toggleTracking() {
  if (!selBus)  { alert('Please select your bus first!');   return; }
  if (!selTrip) { alert('Please select your shift first!'); return; }
  isTracking ? stopTracking() : startTracking();
}

let wakeLock = null;
async function requestWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return;
    if (wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', async () => {
      wakeLock = null;
      if (isTracking) await requestWakeLock();
    });
  } catch (err) {}
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && isTracking) {
    await requestWakeLock();
    if (!watchId) startWatching();
  }
});

function getSmoothedLocation(lat, lng) {
  gpsBuffer.push({ lat, lng });
  if (gpsBuffer.length > 2) gpsBuffer.shift();
  return {
    lat: gpsBuffer.reduce((a, b) => a + b.lat, 0) / gpsBuffer.length,
    lng: gpsBuffer.reduce((a, b) => a + b.lng, 0) / gpsBuffer.length
  };
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1*Math.PI/180) *
               Math.cos(lat2*Math.PI/180) *
               Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Sequential, routes.js order only. Checks a few stops ahead (not
// just the immediate next one) so ONE bad GPS radius miss can never
// permanently freeze the route — but it still only ever moves forward,
// in the exact order routes.js defines, never jumping backward or
// picking a "nearest" stop out of sequence. ──
function advanceStopIndex(lat, lng) {
  const stops = ROUTE_STOPS[selBus] || [];
  if (stops.length === 0) retur
  if (stopIndex >= stops.length - 1) return;

  const maxCheck = Math.min(stopIndex + MAX_LOOKAHEAD, stops.length - 1);

  for (let i = maxCheck; i >= stopIndex + 1; i--) {
    const coord = STOP_COORDS[stops[i]];
    if (!coord) continue;
    const dist = getDistance(lat, lng, coord.lat, coord.lng);
    if (dist < STOP_ARRIVAL_RADIUS_KM) {
      stopIndex = i;
      return;
    }
  }
}

function getDb() {
  if (typeof db !== 'undefined') return db;
  try { return firebase.database(); } catch(e) { return null; }
}

function startWatching() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: rawLat, longitude: rawLng, heading, speed, accuracy } = pos.coords;

      document.getElementById('gpsVal').innerText = accuracy > 100
        ? '⚠️ GPS: ' + Math.round(accuracy) + 'm — Move outdoors'
        : '✅ ' + Math.round(accuracy) + 'm — ' +
          rawLat.toFixed(5) + ', ' + rawLng.toFixed(5);

      gpsCount++;
      document.getElementById('gpsCount').innerText = gpsCount;

      const { lat, lng } = getSmoothedLocation(rawLat, rawLng);

      advanceStopIndex(lat, lng);
      updateStopProgress(stopIndex);

      const stops = ROUTE_STOPS[selBus] || [];
      const nextStopName = stops[Math.min(stopIndex + 1, stops.length - 1)] || '—';
      document.getElementById('nextStop').innerText = nextStopName;

      const database = getDb();
      if (!database) {
        document.getElementById('gpsVal').innerText = '❌ Firebase not ready';
        return;
      }

      database.ref('liveLocation/' + selBus).set({
        lat, lng,
        heading:   heading  || 0,
        speed:     speed    || 0,
        accuracy,
        trip:      selTrip,
        stopIndex: stopIndex,
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

function startTracking() {
  isTracking = true;
  gpsBuffer  = [];
  gpsCount   = 0;
  stopIndex  = 0;

  document.getElementById('bigCircle').classList.add('live');
  document.getElementById('ctext').innerText    = 'SHARING LIVE';
  document.getElementById('badge').classList.add('live');
  document.getElementById('bdot').classList.add('live');
  document.getElementById('btext').innerText    = 'Location LIVE';
  document.getElementById('gpsCount').innerText = '0';

  requestWakeLock();
  startWatching();
}

function stopTracking() {
  isTracking = false;
  gpsBuffer  = [];
  if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
  const database = getDb();
  if (database) database.ref('liveLocation/' + selBus).remove();
  document.getElementById('bigCircle').classList.remove('live');
  document.getElementById('ctext').innerText    = 'TAP TO SHARE';
  document.getElementById('badge').classList.remove('live');
  document.getElementById('bdot').classList.remove('live');
  document.getElementById('btext').innerText    = 'Location OFF';
  document.getElementById('gpsVal').innerText   = 'Not sharing';
  document.getElementById('gpsCount').innerText = '0';
  gpsCount = 0;
}

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