/* ============================================================
   tracker.js — Student-facing bus tracker logic
   All constants defined here to avoid loading order issues
   ============================================================ */

// ── Inline constants (safe fallback if config.js fails) ──────
const _BELAGAVI_BOUNDS = (typeof BELAGAVI_BOUNDS !== 'undefined')
  ? BELAGAVI_BOUNDS
  : [[15.7800, 74.4000], [15.9000, 74.6000]];

const _CAMPUS = (typeof CAMPUS_LOCATION !== 'undefined')
  ? CAMPUS_LOCATION
  : { lat: 15.8164, lng: 74.4835 };

const _OLA_KEY = (typeof OLA_MAPS_API_KEY !== 'undefined')
  ? OLA_MAPS_API_KEY
  : 's0OZq9XTSK6I8m2YxidijWQDa4JmxdgMCQvXglZo';

const _CLEANUP_HRS = (typeof SHIFT_END_CLEANUP_HOURS !== 'undefined')
  ? SHIFT_END_CLEANUP_HOURS : 1;

const _SPD_BUF = (typeof SPEED_BUFFER_SIZE !== 'undefined')
  ? SPEED_BUFFER_SIZE : 10;

const _DEFAULT_SPD = (typeof CITY_DEFAULT_SPEED_MS !== 'undefined')
  ? CITY_DEFAULT_SPEED_MS : (25 / 3.6);

const _ETA_BUF = (typeof ETA_TRAFFIC_BUFFER !== 'undefined')
  ? ETA_TRAFFIC_BUFFER : 1.10;

const _DRIVER_DB = (typeof DRIVER_DB !== 'undefined')
  ? DRIVER_DB : {};

// ── Wait for Firebase db ──────────────────────────────────────
function getDb() {
  if (typeof db !== 'undefined') return db;
  if (typeof firebase !== 'undefined') {
    try {
      return firebase.database();
    } catch(e) {}
  }
  return null;
}

// ── State ─────────────────────────────────────────────────────
let map, busMarker, dbListenerRef;
let currentBusKey  = null;
let speedHistory   = [];
let routeStopIndex = 0;

const gpsQueue   = [];
let isAnimating  = false;
let lastPoint    = null;
let predictionId = null;

// ── Map setup ─────────────────────────────────────────────────
const belagaviBounds = L.latLngBounds(
  L.latLng(_BELAGAVI_BOUNDS[0][0], _BELAGAVI_BOUNDS[0][1]),
  L.latLng(_BELAGAVI_BOUNDS[1][0], _BELAGAVI_BOUNDS[1][1])
);

map = L.map('map', {
  center:             [15.8500, 74.5100],
  zoom:               13,
  minZoom:            10,
  maxZoom:            18,
  maxBounds:          belagaviBounds,
  maxBoundsViscosity: 1.0,
  zoomControl:        false,
});

L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  attribution: '© Google Maps',
}).addTo(map);

const routeMarkersGroup = L.layerGroup().addTo(map);

// Campus pin
L.circleMarker([_CAMPUS.lat, _CAMPUS.lng], {
  radius: 8, color: '#ffffff', weight: 2,
  fillColor: '#dc2626', fillOpacity: 1,
}).addTo(map);

L.marker([_CAMPUS.lat, _CAMPUS.lng], {
  icon: L.divIcon({
    className: 'google-stop-label',
    html: `<span class="stop-text-pill" style="color:#dc2626 !important;border-color:#dc2626;">📍 KLS GIT Campus</span>`,
    iconAnchor: [45, 0],
  }),
}).addTo(map);

// ── Shift dropdown ────────────────────────────────────────────
window.onShiftChange = function () {
  const shift     = document.getElementById('shiftSelect').value;
  const busSelect = document.getElementById('busSelect');
  busSelect.innerHTML = '<option value="">-- Choose Bus --</option>';
  if (!shift || typeof SHIFT_BUSES === 'undefined') return;
  SHIFT_BUSES[shift].forEach(bus => {
    const opt       = document.createElement('option');
    opt.value       = bus.id;
    opt.textContent = bus.label;
    busSelect.appendChild(opt);
  });
};

// ── Draw route stops ──────────────────────────────────────────
function plotRouteStops(busKey) {
  setTimeout(() => {
    document.getElementById('topbar')?.classList.add('collapsed');
    const btn = document.getElementById('togglePanelBtn');
    if (btn) btn.innerHTML = '▼';
  }, 800);

  routeMarkersGroup.clearLayers();
  if (typeof ROUTE_STOPS === 'undefined' || typeof STOP_COORDS === 'undefined') return;

  const stopsList = ROUTE_STOPS[busKey] || [];
  stopsList.forEach(stopName => {
    const coords = STOP_COORDS[stopName];
    if (!coords) return;
    L.circleMarker([coords.lat, coords.lng], {
      radius: 6, color: '#ffffff', weight: 1.8,
      fillColor: '#1a73e8', fillOpacity: 1,
    }).addTo(routeMarkersGroup);
    L.marker([coords.lat, coords.lng], {
      icon: L.divIcon({
        className: 'google-stop-label',
        html: `<span class="stop-text-pill">${stopName}</span>`,
        iconAnchor: [45, 0],
      }),
    }).addTo(routeMarkersGroup);
  });
}

// ── Bus icon ──────────────────────────────────────────────────
function updateBusIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🚌</div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  });
}

// ── Haversine distance ────────────────────────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1*Math.PI/180) *
               Math.cos(lat2*Math.PI/180) *
               Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Smooth animation queue ────────────────────────────────────
function enqueuePoint(point) {
  if (lastPoint) {
    const dist = getDistance(lastPoint.lat, lastPoint.lng, point.lat, point.lng);
    if (dist > 0.2 && point.speed < 5) return;
  }
  gpsQueue.push(point);
  if (!isAnimating) processQueue();
}

function processQueue() {
  if (gpsQueue.length === 0) {
    isAnimating = false;
    if (lastPoint && lastPoint.speed > 1.5) startPrediction();
    return;
  }
  isAnimating = true;
  stopPrediction();

  const from = lastPoint;
  const to   = gpsQueue.shift();

  if (!from) {
    lastPoint = to;
    if (busMarker) busMarker.setLatLng([to.lat, to.lng]);
    processQueue();
    return;
  }

  const timeDiff = to.updatedAt - from.updatedAt;
  const duration = Math.min(Math.max(timeDiff, 500), 3000);
  const dist     = getDistance(from.lat, from.lng, to.lat, to.lng);

  if (dist > 0.5) {
    lastPoint = to;
    if (busMarker) busMarker.setLatLng([to.lat, to.lng]);
    processQueue();
    return;
  }

  const startLat  = from.lat, startLng = from.lng;
  const endLat    = to.lat,   endLng   = to.lng;
  const startTime = performance.now();

  function animate(now) {
    const p    = Math.min((now - startTime) / duration, 1);
    const ease = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
    if (busMarker) busMarker.setLatLng([
      startLat + (endLat - startLat) * ease,
      startLng + (endLng - startLng) * ease,
    ]);
    if (p < 1) { requestAnimationFrame(animate); }
    else        { lastPoint = to; processQueue(); }
  }
  requestAnimationFrame(animate);
}

// ── Predictive movement ───────────────────────────────────────
function startPrediction() {
  if (!lastPoint || lastPoint.speed < 1.5) return;
  stopPrediction();
  const speedMs    = lastPoint.speed;
  const headingRad = (lastPoint.heading || 0) * Math.PI / 180;
  let predLat = lastPoint.lat, predLng = lastPoint.lng, lastTime = performance.now();
  function predict(now) {
    const dt  = (now - lastTime) / 1000; lastTime = now;
    predLat  += (speedMs * dt * Math.cos(headingRad)) / 111320;
    predLng  += (speedMs * dt * Math.sin(headingRad)) /
                (111320 * Math.cos(predLat * Math.PI / 180));
    if (busMarker) busMarker.setLatLng([predLat, predLng]);
    predictionId = requestAnimationFrame(predict);
  }
  predictionId = requestAnimationFrame(predict);
}

function stopPrediction() {
  if (predictionId) { cancelAnimationFrame(predictionId); predictionId = null; }
}

// ── Snap to road ──────────────────────────────────────────────
async function snapToRoad(lat, lng) {
  try {
    const res  = await fetch(
      `https://api.olamaps.io/routing/v1/snapToRoads?points=${lat},${lng}&api_key=${_OLA_KEY}`,
      { method: 'POST' }
    );
    const json = await res.json();
    if (json.snapped_points?.length > 0) {
      return {
        lat: json.snapped_points[0].location.latitude,
        lng: json.snapped_points[0].location.longitude,
      };
    }
  } catch (e) {}
  return { lat, lng };
}

// ── ETA color ─────────────────────────────────────────────────
function getEtaColor(m) {
  if (m < 5)  return '#dc2626';
  if (m < 10) return '#f59e0b';
  return '#16a34a';
}

// ── ETA calculation ───────────────────────────────────────────
async function processRoadETA(busLat, busLng, busSpeed, stopIndex, busKey) {
  try {
    if (typeof ROUTE_STOPS === 'undefined' || typeof STOP_COORDS === 'undefined') return;

    const stops = ROUTE_STOPS[busKey] || [];
    if (stops.length === 0) return;

    // Use stopIndex from Firebase — this is the next stop index
    // Driver app sets stopIndex = number of stops passed
    // So next stop = stops[stopIndex]
    const nextIdx = (typeof stopIndex === 'number' && stopIndex >= 0)
      ? Math.min(stopIndex, stops.length - 1)
      : routeStopIndex;

    // Arrived at final destination
    if (nextIdx >= stops.length) {
      document.getElementById('etaTime').innerText        = '✅';
      document.getElementById('etaDestination').innerText = 'Arrived at destination';
      document.getElementById('etaDist').innerText        = '';
      return;
    }

    const nextStopName  = stops[nextIdx];
    const nextStopCoord = STOP_COORDS[nextStopName];

    // Stop name mismatch — show warning in ETA card
    if (!nextStopCoord) {
      document.getElementById('etaDestination').innerText = `Next: ${nextStopName}`;
      document.getElementById('etaTime').innerText        = '—';
      document.getElementById('etaDist').innerText        = 'Coordinates not found';
      return;
    }

    // Straight line distance
    const distKm  = getDistance(busLat, busLng, nextStopCoord.lat, nextStopCoord.lng);
    const speedMs = (busSpeed && busSpeed > 0.5) ? busSpeed : _DEFAULT_SPD;
    const speedKmh = speedMs * 3.6;

    // Try OLA Maps road ETA
    let etaMinutes;
    try {
      const res  = await fetch(
        `https://api.olamaps.io/routing/v1/directions` +
        `?origin=${busLat},${busLng}` +
        `&destination=${nextStopCoord.lat},${nextStopCoord.lng}` +
        `&overview=full&api_key=${_OLA_KEY}`
      );
      const json = await res.json();
      if (json.status === 'SUCCESS' && json.routes?.length) {
        const leg     = json.routes[0].legs.find(l => l != null);
        const roadDist = leg?.distance?.value ?? leg?.distance_meters ?? 0;
        const roadDur  = leg?.duration?.value ?? leg?.duration_seconds ?? 0;
        if (roadDist > 0 && roadDur > 0) {
          const olaSpeedMs = roadDist / roadDur;
          etaMinutes = Math.max(1, Math.round(
            (roadDur * (olaSpeedMs / speedMs) * _ETA_BUF) / 60
          ));
        }
      }
    } catch (e) {}

    // Fallback haversine ETA
    if (!etaMinutes) {
      etaMinutes = Math.max(1, Math.round((distKm / speedKmh) * 60));
    }

    // Stopped bus detection
    const isStopped = speedHistory.length >= 3 &&
                      speedHistory.every(s => s < 0.5);

    // Update ETA card
    const etaEl  = document.getElementById('etaTime');
    etaEl.innerText   = isStopped ? '~' + etaMinutes : String(etaMinutes);
    etaEl.style.color = getEtaColor(etaMinutes);

    document.getElementById('etaDestination').innerText = `Next Stop: ${nextStopName}`;
    document.getElementById('etaDist').innerText = isStopped
      ? `${distKm.toFixed(1)} km — Bus may be stopped`
      : `${distKm.toFixed(1)} km away`;

  } catch (err) {
    console.error('ETA error:', err);
  }
}

// ── Bus selection ─────────────────────────────────────────────
window.selectBus = function () {
  const busKey = document.getElementById('busSelect').value;
  if (!busKey) return;

  const _db = getDb();
  if (!_db) { console.error('Firebase db not available'); return; }

  if (currentBusKey && dbListenerRef) {
    _db.ref('liveLocation/' + currentBusKey).off('value', dbListenerRef);
  }

  currentBusKey   = busKey;
  speedHistory    = [];
  routeStopIndex  = 0;
  lastPoint       = null;
  gpsQueue.length = 0;
  stopPrediction();

  document.getElementById('info').innerText = 'Syncing data feed...';
  document.getElementById('driverInfo').innerText =
    `Driver: ${_DRIVER_DB[busKey] || 'Assigned Duty Driver'}`;

  plotRouteStops(busKey);
  if (busMarker) { map.removeLayer(busMarker); busMarker = null; }

  dbListenerRef = _db.ref('liveLocation/' + busKey).on('value', snap => {
    const data = snap.val();

    if (data?.updatedAt) {
      const ageHours = (Date.now() - data.updatedAt) / 3600000;
      if (ageHours > _CLEANUP_HRS) {
        _db.ref('liveLocation/' + busKey).remove();
        return;
      }
    }

    if (!data?.lat || !data?.lng) {
      document.getElementById('info').innerText        = '🔴 Bus is currently OFFLINE';
      document.getElementById('etaCard').style.display = 'none';
      if (busMarker) { map.removeLayer(busMarker); busMarker = null; }
      lastPoint = null; gpsQueue.length = 0; stopPrediction();
      return;
    }

    if (!busMarker) {
      busMarker = L.marker([data.lat, data.lng], {
        icon: updateBusIcon(), zIndexOffset: 1000,
      }).addTo(map);
      map.setView([data.lat, data.lng], 15);
    }

    const rawSpeed = typeof data.speed === 'number' && data.speed > 0.5 ? data.speed : null;
    if (rawSpeed !== null) {
      speedHistory.push(rawSpeed);
      if (speedHistory.length > _SPD_BUF) speedHistory.shift();
    }

    snapToRoad(data.lat, data.lng).then(snapped => {
      enqueuePoint({
        lat:       snapped.lat,
        lng:       snapped.lng,
        speed:     data.speed   || 0,
        heading:   data.heading || 0,
        updatedAt: data.updatedAt || Date.now(),
      });
      // Pan map to follow bus
      map.panTo([snapped.lat, snapped.lng], { animate: true, duration: 1 });
    });

    document.getElementById('info').innerText        = '🟢 Link Connection Active';
    document.getElementById('etaCard').style.display = 'block';

    processRoadETA(data.lat, data.lng, data.speed, data.stopIndex, busKey);
  });
};

// ── Topbar toggle ─────────────────────────────────────────────
window.toggleTopbar = function () {
  const topbar = document.getElementById('topbar');
  const btn    = document.getElementById('togglePanelBtn');
  topbar.classList.toggle('collapsed');
  btn.innerHTML = topbar.classList.contains('collapsed') ? '▼' : '▲';
};