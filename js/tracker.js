/* ============================================================
   tracker.js — Student-facing bus tracker logic
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let map, busMarker, dbListenerRef;
let currentBusKey  = null;
let speedHistory   = [];
let routeStopIndex = 0;

// ── GPS Queue System ─────────────────────────────────────────
const gpsQueue   = [];
let isAnimating  = false;
let lastPoint    = null;
let predictionId = null;

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

// ── Shift dropdown ───────────────────────────────────────────
window.onShiftChange = function () {
  const shift     = document.getElementById('shiftSelect').value;
  const busSelect = document.getElementById('busSelect');
  busSelect.innerHTML = '<option value="">-- Choose Bus --</option>';
  if (!shift) return;
  SHIFT_BUSES[shift].forEach(bus => {
    const opt       = document.createElement('option');
    opt.value       = bus.id;
    opt.textContent = bus.label;
    busSelect.appendChild(opt);
  });
};

// ── Draw route stops ─────────────────────────────────────────
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
        html: `<span class="stop-text-pill">${stopName}</span>`,
        iconAnchor: [45, 0],
      }),
    }).addTo(routeMarkersGroup);
  });
}

// ── Bus icon with rotation ───────────────────────────────────
function updateBusIcon(heading) {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🚌</div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  });
}

// ── Queue-based smooth animation ─────────────────────────────
function enqueuePoint(point) {
  gpsQueue.push(point);
  if (!isAnimating) processQueue();
}

function processQueue() {
  if (gpsQueue.length === 0) {
    isAnimating = false;
    if (lastPoint && lastPoint.speed > 1.5) {
      startPrediction();
    }
    return;
  }

  isAnimating = true;
  stopPrediction();

  const from = lastPoint;
  const to   = gpsQueue.shift();

  if (!from) {
    lastPoint = to;
    if (busMarker) {
      busMarker.setLatLng([to.lat, to.lng]);
      busMarker.setIcon(updateBusIcon(to.heading));
    }
    processQueue();
    return;
  }

  const timeDiff = to.updatedAt - from.updatedAt;
  const duration = Math.min(Math.max(timeDiff, 500), 3000);

  const dist = getDistance(from.lat, from.lng, to.lat, to.lng);
  if (dist > 0.5) {
    lastPoint = to;
    if (busMarker) {
      busMarker.setLatLng([to.lat, to.lng]);
      busMarker.setIcon(updateBusIcon(to.heading));
    }
    processQueue();
    return;
  }

  const startLat  = from.lat;
  const startLng  = from.lng;
  const endLat    = to.lat;
  const endLng    = to.lng;
  const startTime = performance.now();

  function animate(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    const lat = startLat + (endLat - startLat) * ease;
    const lng = startLng + (endLng - startLng) * ease;

    if (busMarker) busMarker.setLatLng([lat, lng]);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      lastPoint = to;
      if (busMarker) busMarker.setIcon(updateBusIcon(to.heading));
      processQueue();
    }
  }

  requestAnimationFrame(animate);
}

// ── Predictive movement ───────────────────────────────────────
function startPrediction() {
  if (!lastPoint || lastPoint.speed < 1.5) return;
  stopPrediction();

  const speedMs    = lastPoint.speed;
  const headingRad = (lastPoint.heading || 0) * Math.PI / 180;
  let   predLat    = lastPoint.lat;
  let   predLng    = lastPoint.lng;
  let   lastTime   = performance.now();

  function predict(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const dLat = (speedMs * dt * Math.cos(headingRad)) / 111320;
    const dLng = (speedMs * dt * Math.sin(headingRad)) /
                 (111320 * Math.cos(predLat * Math.PI / 180));

    predLat += dLat;
    predLng += dLng;

    if (busMarker) busMarker.setLatLng([predLat, predLng]);
    predictionId = requestAnimationFrame(predict);
  }

  predictionId = requestAnimationFrame(predict);
}

function stopPrediction() {
  if (predictionId) {
    cancelAnimationFrame(predictionId);
    predictionId = null;
  }
}

// ── ETA calculation ──────────────────────────────────────────
async function processRoadETA(driverLat, driverLng) {
  try {
    const activeStops = ROUTE_STOPS[currentBusKey] || [];
    if (activeStops.length === 0) return;

    // ── Advance stop ONLY when bus is within 150m of current stop ──
    const currentStopName  = activeStops[routeStopIndex];
    const currentStopCoord = STOP_COORDS[currentStopName];
    if (currentStopCoord) {
      const distToCurrentStop = getDistance(
        driverLat, driverLng,
        currentStopCoord.lat, currentStopCoord.lng
      );
      if (distToCurrentStop < 0.15 && routeStopIndex < activeStops.length - 1) {
        routeStopIndex++;
      }
    }

    const destName  = activeStops[routeStopIndex];
    if (!destName) return;
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

    const roadDistanceMeters = leg.distance?.value ?? leg.distance_meters ??
      (typeof leg.distance === 'number' ? leg.distance : 0);
    const olaDuration = leg.duration?.value ?? leg.duration_seconds ??
      (typeof leg.duration === 'number' ? leg.duration : 0);
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
    const isStopped  = speedHistory.length >= 3 &&
                       speedHistory.every(s => s < 1.5);

    document.getElementById('etaTime').innerText        = isStopped ? '~' + etaMinutes : etaMinutes;
    document.getElementById('etaDestination').innerText = `Next Stop: ${destName}`;
    document.getElementById('etaDist').innerText        = isStopped
      ? `${roadDistanceKm} km — Bus may be stopped`
      : `${roadDistanceKm} km away`;

  } catch (err) {
    console.error('ETA error:', err);
  }
}

// ── Bus selection ────────────────────────────────────────────
window.selectBus = function () {
  const busKey = document.getElementById('busSelect').value;
  if (!busKey) return;

  if (currentBusKey && dbListenerRef) {
    db.ref('liveLocation/' + currentBusKey).off('value', dbListenerRef);
  }

  currentBusKey   = busKey;
  speedHistory    = [];
  routeStopIndex  = 0;
  lastPoint       = null;
  gpsQueue.length = 0;
  stopPrediction();

  document.getElementById('info').innerText = 'Syncing data feed...';
  document.getElementById('driverInfo').innerText =
    `Driver: ${DRIVER_DB[busKey] || 'Assigned Duty Driver'}`;

  plotRouteStops(busKey);

  if (busMarker) map.removeLayer(busMarker);
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
      document.getElementById('info').innerText        = '🔴 Bus is currently OFFLINE';
      document.getElementById('etaCard').style.display = 'none';
      if (busMarker) map.removeLayer(busMarker);
      busMarker       = null;
      lastPoint       = null;
      gpsQueue.length = 0;
      stopPrediction();
      return;
    }

    if (!busMarker) {
      busMarker = L.marker([data.lat, data.lng], {
        icon:         updateBusIcon(data.heading || 0),
        zIndexOffset: 1000,
      }).addTo(map);
      map.setView([data.lat, data.lng], 15);
    }

    const rawSpeed = (typeof data.speed === 'number' && data.speed > 1.5) ? data.speed : null;
    if (rawSpeed !== null) {
      speedHistory.push(rawSpeed);
      if (speedHistory.length > SPEED_BUFFER_SIZE) speedHistory.shift();
    }

    enqueuePoint({
      lat:       data.lat,
      lng:       data.lng,
      speed:     data.speed   || 0,
      heading:   data.heading || 0,
      updatedAt: data.updatedAt || Date.now(),
    });

    document.getElementById('info').innerText        = '🟢 Link Connection Active';
    document.getElementById('etaCard').style.display = 'block';

    processRoadETA(data.lat, data.lng);
  });
};

// ── Topbar toggle ────────────────────────────────────────────
window.toggleTopbar = function () {
  const topbar = document.getElementById('topbar');
  const btn    = document.getElementById('togglePanelBtn');
  topbar.classList.toggle('collapsed');
  btn.innerHTML = topbar.classList.contains('collapsed') ? '▼' : '▲';
};