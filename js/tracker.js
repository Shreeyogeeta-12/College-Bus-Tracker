/* ============================================================
   tracker.js — Student-facing bus tracker logic
   Depends on (loaded before this file):
     config.js  → db, CAMPUS_LOCATION, BELAGAVI_BOUNDS,
                   SPEED_BUFFER_SIZE, CITY_DEFAULT_SPEED_MS, ETA_TRAFFIC_BUFFER
     data/stops.js   → STOP_COORDS
     data/routes.js  → ROUTE_STOPS
     data/shifts.js  → SHIFT_BUSES
     data/drivers.js → DRIVER_DB
     utils.js        → getDistance()
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let map, busMarker, dbListenerRef;
let currentBusKey  = null;
let locationPoints = [];
let speedHistory   = [];
let routeStopIndex = 0;

// ── Map setup ────────────────────────────────────────────────
const belagaviBounds = L.latLngBounds(
  L.latLng(BELAGAVI_BOUNDS[0][0], BELAGAVI_BOUNDS[0][1]),
  L.latLng(BELAGAVI_BOUNDS[1][0], BELAGAVI_BOUNDS[1][1])
);

map = L.map('map', {
  center:              [15.8500, 74.5100],
  zoom:                13,
  minZoom:             10,
  maxZoom:             18,
  maxBounds:           belagaviBounds,
  maxBoundsViscosity:  1.0,
  zoomControl:         false,
});

L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  attribution: '© Google Maps',
}).addTo(map);

const routeMarkersGroup = L.layerGroup().addTo(map);

// Campus pin
L.circleMarker([CAMPUS_LOCATION.lat, CAMPUS_LOCATION.lng], {
  radius: 8, color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1,
}).addTo(map);

L.marker([CAMPUS_LOCATION.lat, CAMPUS_LOCATION.lng], {
  icon: L.divIcon({
    className: 'google-stop-label',
    html: `<span class="stop-text-pill" style="color:#dc2626 !important; border-color:#dc2626;">📍 KLS GIT Campus</span>`,
    iconAnchor: [45, 0],
  }),
}).addTo(map);

// ── Shift dropdown → populate bus list ──────────────────────
window.onShiftChange = function () {
  const shift     = document.getElementById('shiftSelect').value;
  const busSelect = document.getElementById('busSelect');
  busSelect.innerHTML = '<option value="">-- Choose Bus --</option>';
  if (!shift) return;

  SHIFT_BUSES[shift].forEach(bus => {
    const opt = document.createElement('option');
    opt.value       = bus.id;
    opt.textContent = bus.label;
    busSelect.appendChild(opt);
  });
};

// ── Draw route stops on map ──────────────────────────────────
function plotRouteStops(busKey) {
  setTimeout(() => {
    document.getElementById('topbar').classList.add('collapsed');
    document.getElementById('togglePanelBtn').innerHTML = '▼';
  }, 800);

  routeMarkersGroup.clearLayers();

  const stopsList = ROUTE_STOPS[busKey] || [];
  stopsList.forEach(stopName => {
    const coords = STOP_COORDS[stopName];
    if (!coords) return;

    L.circleMarker([coords.lat, coords.lng], {
      radius: 6, color: '#ffffff', weight: 1.8, fillColor: '#1a73e8', fillOpacity: 1,
    }).addTo(routeMarkersGroup);

    L.marker([coords.lat, coords.lng], {
      icon: L.divIcon({
        className: 'google-stop-label',
        html:      `<span class="stop-text-pill">${stopName}</span>`,
        iconAnchor: [45, 0],
      }),
    }).addTo(routeMarkersGroup);
  });
}

// ── ETA calculation ─────────────────────────────────────────
async function processRoadETA(driverLat, driverLng) {
  try {
    const activeStops = ROUTE_STOPS[currentBusKey] || [];
    if (activeStops.length === 0) return;

    while (routeStopIndex < activeStops.length - 1) {
      const targetName   = activeStops[routeStopIndex];
      const targetCoord  = STOP_COORDS[targetName] || CAMPUS_LOCATION;
      const distToTarget = getDistance(driverLat, driverLng, targetCoord.lat, targetCoord.lng);
      if (distToTarget < 0.3) {
        routeStopIndex++;
      } else {
        break;
      }
    }

    const destName  = activeStops[routeStopIndex];
    const destCoord = STOP_COORDS[destName] || CAMPUS_LOCATION;

    const response = await fetch(
      `https://api.olamaps.io/routing/v1/directions` +
      `?origin=${driverLat},${driverLng}` +
      `&destination=${destCoord.lat},${destCoord.lng}` +
      `&overview=full` +
      `&api_key=${OLA_MAPS_API_KEY}`,
      { method: 'POST' }
    );
    const json = await response.json();
    if (!json.routes || !json.routes.length) return;
    if (json.status !== 'SUCCESS') return;

    const leg = json.routes[0].legs.find(l => l != null);
    if (!leg) return;

    const roadDistanceMeters = leg.distance?.value ?? leg.distance_meters ?? (typeof leg.distance === 'number' ? leg.distance : 0);
    const olaDuration        = leg.duration?.value ?? leg.duration_seconds ?? (typeof leg.duration === 'number' ? leg.duration : 0);
    if (!roadDistanceMeters || !olaDuration) return;

    const roadDistanceKm = (roadDistanceMeters / 1000).toFixed(1);

    let etaSeconds;
    if (speedHistory.length > 0) {
      const sorted     = [...speedHistory].sort((a, b) => a - b);
      const trimmed    = sorted.slice(1, -1);
      const avgSpeedMs = trimmed.length > 0
        ? trimmed.reduce((a, b) => a + b, 0) / trimmed.length
        : CITY_DEFAULT_SPEED_MS;
      const validSpeed = avgSpeedMs > 1.5 ? avgSpeedMs : CITY_DEFAULT_SPEED_MS;
      const olaSpeedMs = roadDistanceMeters / olaDuration;
      const ratio      = olaSpeedMs / validSpeed;
      etaSeconds       = olaDuration * ratio * ETA_TRAFFIC_BUFFER;
    } else {
      etaSeconds = olaDuration * 1.15;
    }
    const etaMinutes = Math.max(1, Math.round(etaSeconds / 60));

    const isStopped = speedHistory.length >= 3 && speedHistory.every(s => s < 1.5);

    document.getElementById('etaTime').innerText        = isStopped ? '~' + etaMinutes : etaMinutes;
    document.getElementById('etaDestination').innerText = `Next Stop: ${destName}`;
    document.getElementById('etaDist').innerText        = isStopped
      ? `${roadDistanceKm} km — Bus may be stopped`
      : `${roadDistanceKm} km away`;

  } catch (err) {
    console.error('ETA error:', err);
  }
}

// ── Bus selection → start listening to Firebase ─────────────
window.selectBus = function () {
  const busKey = document.getElementById('busSelect').value;
  if (!busKey) return;

  if (currentBusKey && dbListenerRef) {
    db.ref('liveLocation/' + currentBusKey).off('value', dbListenerRef);
  }

  currentBusKey  = busKey;
  locationPoints = [];
  speedHistory   = [];
  routeStopIndex = 0;
  document.getElementById('info').innerText = 'Syncing data feed...';
  document.getElementById('driverInfo').innerText =
    `Driver: ${DRIVER_DB[busKey] || 'Assigned Duty Driver'}`;

  plotRouteStops(busKey);

  if (busMarker) map.removeLayer(busMarker);
  if (window.activeLivePathSnippet) {
    map.removeLayer(window.activeLivePathSnippet);
    window.activeLivePathSnippet = null;
  }
  busMarker = null;

  dbListenerRef = db.ref('liveLocation/' + busKey).on('value', snap => {
    const data = snap.val();

    if (data && data.updatedAt) {
      const ageHours = (Date.now() - data.updatedAt) / (1000 * 60 * 60);
      if (ageHours > SHIFT_END_CLEANUP_HOURS) {
        db.ref('liveLocation/' + busKey).remove();
        return;
      }
    }

    if (!data || !data.lat || !data.lng) {
      document.getElementById('info').innerText          = '🔴 Bus is currently OFFLINE';
      document.getElementById('etaCard').style.display   = 'none';
      if (busMarker) map.removeLayer(busMarker);
      busMarker = null;
      return;
    }

    const latlng = [data.lat, data.lng];

    const rawSpeed = (typeof data.speed === 'number' && data.speed > 1.5) ? data.speed : null;
    if (rawSpeed !== null) {
      speedHistory.push(rawSpeed);
      if (speedHistory.length > SPEED_BUFFER_SIZE) speedHistory.shift();
    }

    if (!busMarker) {
      busMarker = L.marker(latlng, {
        icon: L.divIcon({
          html:      `<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚌</div>`,
          className: '',
          iconSize:  [26, 26],
          iconAnchor:[13, 13],
        }),
      }).addTo(map);
    } else {
      busMarker.setLatLng(latlng);
    }

    map.setView(latlng, 13);
    document.getElementById('info').innerText          = '🟢 Link Connection Active';
    document.getElementById('etaCard').style.display   = 'block';

    processRoadETA(data.lat, data.lng);
  });
};

// ── Topbar collapse/expand toggle ────────────────────────────
window.toggleTopbar = function () {
  const topbar = document.getElementById('topbar');
  const btn    = document.getElementById('togglePanelBtn');
  topbar.classList.toggle('collapsed');
  btn.innerHTML = topbar.classList.contains('collapsed') ? '▼' : '▲';
};