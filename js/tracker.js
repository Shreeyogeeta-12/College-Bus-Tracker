/* ============================================================
   tracker.js — Student-facing bus tracker logic
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let map, busMarker, dbListenerRef;
let currentBusKey  = null;
let speedHistory   = [];
let routeStopIndex = 0;
let etaRequestId   = 0;

// ── Constants ────────────────────────────────────────────────
const STOP_ARRIVAL_RADIUS_KM = 0.3;
const DEFAULT_SPEED_MS       = 6.94;
const MIN_VALID_SPEED_MS     = 0.5;
const STOPPED_CONFIRM_COUNT  = 3;

// ── Map setup (MOVED — runs first, before anything that could crash) ──
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

// ── Normalized stop-name lookup (MADE DEFENSIVE — won't crash the map
//    if STOP_COORDS has a problem; just logs a clear warning instead) ──
const NORMALIZED_STOP_COORDS = {};
try {
  if (typeof STOP_COORDS === 'undefined') {
    throw new Error('STOP_COORDS is undefined — stops.js failed to load or has a syntax error');
  }
  Object.keys(STOP_COORDS).forEach(key => {
    const normalized = key.trim().toLowerCase().replace(/\s+/g, ' ');
    NORMALIZED_STOP_COORDS[normalized] = STOP_COORDS[key];
  });
} catch (err) {
  console.error('[FATAL] Could not build stop lookup:', err.message);
  document.getElementById('info').innerText = '⚠️ Stop data failed to load — check stops.js for errors';
}

function getStopCoord(stopName) {
  if (!stopName) return null;
  const normalized = stopName.trim().toLowerCase().replace(/\s+/g, ' ');
  return NORMALIZED_STOP_COORDS[normalized] || null;
}

// ── GPS Queue System ─────────────────────────────────────────
const gpsQueue   = [];
let isAnimating  = false;
let lastPoint    = null;
let predictionId = null;

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
  const missingStops = [];

  stopsList.forEach(stopName => {
    const coords = getStopCoord(stopName);
    if (!coords) {
      missingStops.push(stopName);
      return;
    }
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

  if (missingStops.length > 0) {
    console.warn(`[Route ${busKey}] Missing coordinates for:`, missingStops);
  }
}

// ── Bus icon ─────────────────────────────────────────────────
function updateBusIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🚌</div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  });
}

// ── Queue-based smooth animation ─────────────────────────────
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
    if (busMarker) busMarker.setLatLng([to.lat, to.lng]);
    processQueue();
    return;
  }

  const timeDiff = to.updatedAt - from.updatedAt;
  const duration = Math.min(Math.max(timeDiff, 500), 3000);

  const dist = getDistance(from.lat, from.lng, to.lat, to.lng);
  if (dist > 0.5) {
    lastPoint = to;
    if (busMarker) busMarker.setLatLng([to.lat, to.lng]);
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

// ── Snap to road ───────────────────────────────────────────────
async function snapToRoad(lat, lng) {
  try {
    const response = await fetch(
      `https://api.olamaps.io/routing/v1/snapToRoads` +
      `?points=${lat},${lng}` +
      `&api_key=${OLA_MAPS_API_KEY}`,
      { method: 'POST' }
    );
    const json = await response.json();
    const points = json.snapped_points || json.snappedPoints;
    if (points && points.length > 0) {
      const p   = points[0];
      const loc = p.location || p;
      const snappedLat = loc.latitude ?? loc.lat;
      const snappedLng = loc.longitude ?? loc.lng;
      if (typeof snappedLat === 'number' && typeof snappedLng === 'number') {
        return { lat: snappedLat, lng: snappedLng };
      }
    }
  } catch (err) {
    console.log('Snap to road failed:', err);
  }
  return { lat, lng };
}

// ── ETA color ──────────────────────────────────────────────────
function getEtaColor(minutes) {
  if (minutes < 5)  return '#dc2626';
  if (minutes < 10) return '#f59e0b';
  return '#16a34a';
}

// ── Resolve which stop index to use ──────────────────────────
function resolveStopIndex(busKey, data) {
  const stops = ROUTE_STOPS[busKey] || [];
  if (stops.length === 0) return 0;

  if (typeof data.stopIndex === 'number' && data.stopIndex >= 0) {
    routeStopIndex = Math.min(data.stopIndex, stops.length - 1);
    return routeStopIndex;
  }

  if (routeStopIndex < stops.length - 1) {
    const targetName  = stops[routeStopIndex];
    const targetCoord = getStopCoord(targetName);
    if (targetCoord) {
      const dist = getDistance(data.lat, data.lng, targetCoord.lat, targetCoord.lng);
      if (dist < STOP_ARRIVAL_RADIUS_KM) routeStopIndex++;
    }
  }
  return routeStopIndex;
}

// ── ETA calculation ──────────────────────────────────────────
async function processETA(busKey, data) {
  const thisRequestId = ++etaRequestId;
  try {
    const stops = ROUTE_STOPS[busKey] || [];

    if (stops.length === 0) {
      document.getElementById('etaDestination').innerText =
        `⚠️ No route found for busKey "${busKey}"`;
      document.getElementById('etaTime').innerText = '—';
      document.getElementById('etaDist').innerText = '';
      return;
    }

    const stopIndex   = resolveStopIndex(busKey, data);
    const targetName  = stops[stopIndex];
    const targetCoord = getStopCoord(targetName);

    if (!targetCoord) {
      document.getElementById('etaDestination').innerText =
        `⚠️ Stop "${targetName}" has no match in stops.js`;
      document.getElementById('etaTime').innerText = '—';
      document.getElementById('etaDist').innerText = '';
      console.warn(`[ETA] Unresolved stop name: "${targetName}" (busKey: ${busKey}, index: ${stopIndex})`);
      return;
    }

    const haversineDistKm = getDistance(data.lat, data.lng, targetCoord.lat, targetCoord.lng);

    if (stopIndex >= stops.length - 1 && haversineDistKm < STOP_ARRIVAL_RADIUS_KM) {
      if (thisRequestId !== etaRequestId) return;
      document.getElementById('etaDestination').innerText = 'Arrived at destination';
      document.getElementById('etaTime').innerText         = '—';
      document.getElementById('etaTime').style.color       = '#16a34a';
      document.getElementById('etaDist').innerText         = '';
      return;
    }

    let distanceKm  = haversineDistKm;
    let usedRoadApi = false;
    let etaMinutes;

    const rawSpeed    = typeof data.speed === 'number' ? data.speed : 0;
    const speedForEta = rawSpeed > MIN_VALID_SPEED_MS ? rawSpeed : DEFAULT_SPEED_MS;
    const speedKmh    = speedForEta * 3.6;

    try {
      const response = await fetch(
        `https://api.olamaps.io/routing/v1/directions` +
        `?origin=${data.lat},${data.lng}` +
        `&destination=${targetCoord.lat},${targetCoord.lng}` +
        `&overview=full` +
        `&api_key=${OLA_MAPS_API_KEY}`,
        { method: 'POST' }
      );
      const json = await response.json();

      if (json.status === 'SUCCESS' && json.routes && json.routes.length) {
        const leg = json.routes[0].legs.find(l => l != null);
        const roadMeters = leg?.distance?.value ?? leg?.distance_meters ??
          (typeof leg?.distance === 'number' ? leg.distance : 0);
        const roadDur = leg?.duration?.value ?? leg?.duration_seconds ??
          (typeof leg?.duration === 'number' ? leg.duration : 0);

        if (roadMeters > 0) {
          distanceKm  = roadMeters / 1000;
          usedRoadApi = true;
          if (roadDur > 0) {
            const olaSpeedMs = roadMeters / roadDur;
            const ratio      = olaSpeedMs / speedForEta;
            etaMinutes = Math.max(1, Math.round((roadDur * ratio * ETA_TRAFFIC_BUFFER) / 60));
          }
        }
      }
    } catch (err) {
      console.debug('[ETA] OLA road route unavailable, using straight-line distance:', err.message);
    }

    if (!etaMinutes) {
      etaMinutes = Math.max(1, Math.round((distanceKm / speedKmh) * 60));
    }

    if (rawSpeed > 0 && rawSpeed < MIN_VALID_SPEED_MS) {
      speedHistory.push(rawSpeed);
      if (speedHistory.length > STOPPED_CONFIRM_COUNT) speedHistory.shift();
    } else if (rawSpeed >= MIN_VALID_SPEED_MS) {
      speedHistory = [];
    }
    const isStopped = speedHistory.length >= STOPPED_CONFIRM_COUNT;

    if (thisRequestId !== etaRequestId) return;

    const etaEl = document.getElementById('etaTime');
    etaEl.innerText   = isStopped ? '~' + etaMinutes : String(etaMinutes);
    etaEl.style.color = getEtaColor(etaMinutes);

    document.getElementById('etaDestination').innerText = `Next Stop: ${targetName}`;
    document.getElementById('etaDist').innerText = isStopped
      ? `${distanceKm.toFixed(1)} km — bus may be stopped`
      : `${distanceKm.toFixed(1)} km away${usedRoadApi ? '' : ' (straight-line)'}`;

  } catch (err) {
    document.getElementById('etaDestination').innerText = `⚠️ ETA crashed: ${err.message}`;
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
        icon:         updateBusIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
      map.setView([data.lat, data.lng], 15);
    }

    snapToRoad(data.lat, data.lng).then(snapped => {
      enqueuePoint({
        lat:       snapped.lat,
        lng:       snapped.lng,
        speed:     data.speed   || 0,
        heading:   data.heading || 0,
        updatedAt: data.updatedAt || Date.now(),
      });
    });

    document.getElementById('info').innerText        = '🟢 Link Connection Active';
    document.getElementById('etaCard').style.display = 'block';

    processETA(busKey, data);
  });
};

// ── Topbar toggle ────────────────────────────────────────────
window.toggleTopbar = function () {
  const topbar = document.getElementById('topbar');
  const btn    = document.getElementById('togglePanelBtn');
  topbar.classList.toggle('collapsed');
  btn.innerHTML = topbar.classList.contains('collapsed') ? '▼' : '▲';
};