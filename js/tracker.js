/* ============================================================
   tracker.js — Student-facing bus tracker logic
   ============================================================ */

let map, busMarker, dbListenerRef;
let currentBusKey = null;
let speedHistory  = [];     
const gpsQueue   = [];
let isAnimating  = false;
let lastPoint    = null;
let predictionId = null;

const belagaviBounds = L.latLngBounds(
  L.latLng(BELAGAVI_BOUNDS[0][0], BELAGAVI_BOUNDS[0][1]),
  L.latLng(BELAGAVI_BOUNDS[1][0], BELAGAVI_BOUNDS[1][1])
);

map = L.map('map', {
  center: [15.8500, 74.5100], zoom: 13, minZoom: 10, maxZoom: 18,
  maxBounds: belagaviBounds, maxBoundsViscosity: 1.0, zoomControl: false,
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

window.onShiftChange = function () {
  const shift     = document.getElementById('shiftSelect').value;
  const busSelect = document.getElementById('busSelect');
  busSelect.innerHTML = '<option value="">-- Choose Bus --</option>';
  if (!shift) return;
  SHIFT_BUSES[shift].forEach(bus => {
    const opt = document.createElement('option');
    opt.value = bus.id;
    opt.textContent = bus.label;
    busSelect.appendChild(opt);
  });
};

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

function updateBusIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:30px; height:45px;">
        <svg width="30" height="45" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg"
             style="position:absolute; top:0; left:0; filter:drop-shadow(0 2px 3px rgba(0,0,0,0.45));">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#dc2626"/>
          <circle cx="12" cy="12" r="9" fill="#ffffff"/>
          <g transform="translate(5,5) scale(0.6)">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM18 11H6V6h12v5z" fill="#1a73e8"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [30, 45], iconAnchor: [15, 44],
  });
}

function enqueuePoint(point) {
  gpsQueue.push(point);
  if (!isAnimating) processQueue();
}

function processQueue() {
  if (gpsQueue.length === 0) {
    isAnimating = false;
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

  const startLat = from.lat, startLng = from.lng;
  const endLat = to.lat, endLng = to.lng;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress < 0.5 ? 2*progress*progress : -1+(4-2*progress)*progress;
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

function startPrediction() {
  if (!lastPoint || lastPoint.speed < 1.5) return;
  stopPrediction();

  const MAX_PREDICTION_MS = 5000;
  const predStart = performance.now();
  const speedMs = lastPoint.speed;
  const headingRad = (lastPoint.heading || 0) * Math.PI / 180;
  let predLat = lastPoint.lat, predLng = lastPoint.lng;
  let lastTime = performance.now();

  function predict(now) {
    if (now - predStart > MAX_PREDICTION_MS) {
      predictionId = null;
      return;
    }
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    const dLat = (speedMs * dt * Math.cos(headingRad)) / 111320;
    const dLng = (speedMs * dt * Math.sin(headingRad)) / (111320 * Math.cos(predLat * Math.PI / 180));
    predLat += dLat; predLng += dLng;
    if (busMarker) busMarker.setLatLng([predLat, predLng]);
    predictionId = requestAnimationFrame(predict);
  }
  predictionId = requestAnimationFrame(predict);
}

function stopPrediction() {
  if (predictionId) { cancelAnimationFrame(predictionId); predictionId = null; }
}

function getEtaColor(minutes) {
  if (minutes < 5) return '#dc2626';
  if (minutes < 10) return '#f59e0b';
  return '#16a34a';
}

// ── ETA — stopIndex from Firebase = last CONFIRMED PASSED stop.
// Next target is therefore stopIndex + 1. This matches driver.js exactly
// and is the convention proven correct by real GPS testing. ──
async function processRoadETA(busLat, busLng, busSpeed, firebaseStopIndex, busKey) {
  try {
    const stops = ROUTE_STOPS[busKey] || [];
    if (stops.length === 0) return;

    const passedIdx = (typeof firebaseStopIndex === 'number') ? firebaseStopIndex : 0;
    const targetIdx = Math.min(passedIdx + 1, stops.length - 1);

    if (passedIdx >= stops.length - 1) {
      document.getElementById('etaTime').innerText        = '✅';
      document.getElementById('etaDestination').innerText = 'Arrived at destination';
      document.getElementById('etaDist').innerText        = '';
      return;
    }

    const nextStopName  = stops[targetIdx];
    const nextStopCoord = STOP_COORDS[nextStopName];
    if (!nextStopCoord) return;

    const distKm  = getDistance(busLat, busLng, nextStopCoord.lat, nextStopCoord.lng);
    const speedMs = (busSpeed && busSpeed > 0.5) ? busSpeed : CITY_DEFAULT_SPEED_MS;
    const speedKmh = speedMs * 3.6;

    let etaMinutes = null;
    let roadDistKm = distKm;

    try {
      const response = await fetch(
        `https://api.olamaps.io/routing/v1/directions` +
        `?origin=${busLat},${busLng}` +
        `&destination=${nextStopCoord.lat},${nextStopCoord.lng}` +
        `&overview=full&api_key=${OLA_MAPS_API_KEY}`,
        { method: 'POST' }
      );
      const json = await response.json();
      if (json.status === 'SUCCESS' && json.routes && json.routes.length > 0) {
        const leg = json.routes[0].legs.find(l => l != null);
        if (leg) {
          const roadDist = leg.distance?.value ?? leg.distance_meters ?? 0;
          const roadDur  = leg.duration?.value ?? leg.duration_seconds ?? 0;
          if (roadDist && roadDur) {
            roadDistKm = roadDist / 1000;
            const olaSpeed = roadDist / roadDur;
            const ratio = olaSpeed / speedMs;
            etaMinutes = Math.max(1, Math.round((roadDur * ratio * ETA_TRAFFIC_BUFFER) / 60));
          }
        }
      }
    } catch (err) {
      console.log('Ola Maps failed, using haversine');
    }

    if (!etaMinutes) {
      etaMinutes = Math.max(1, Math.round((distKm / speedKmh) * 60));
    }

    const isStopped = speedHistory.length >= 3 && speedHistory.every(s => s < 0.5);

    const etaEl  = document.getElementById('etaTime');
    const destEl = document.getElementById('etaDestination');
    const distEl = document.getElementById('etaDist');

    etaEl.innerText   = isStopped ? '~' + etaMinutes : String(etaMinutes);
    etaEl.style.color = getEtaColor(etaMinutes);
    destEl.innerText  = `Next Stop: ${nextStopName}`;
    distEl.innerText  = isStopped
      ? `${roadDistKm.toFixed(1)} km — Bus may be stopped`
      : `${roadDistKm.toFixed(1)} km away`;

  } catch (err) {
    console.error('ETA error:', err);
  }
}

window.selectBus = function () {
  const busKey = document.getElementById('busSelect').value;
  if (!busKey) return;

  if (currentBusKey && dbListenerRef) {
    db.ref('liveLocation/' + currentBusKey).off('value', dbListenerRef);
  }

  currentBusKey   = busKey;
  speedHistory    = [];
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
        icon: updateBusIcon(), zIndexOffset: 1000,
      }).addTo(map);
      map.setView([data.lat, data.lng], 15);
    }

    const rawSpeed = (typeof data.speed === 'number' && data.speed > 0.5) ? data.speed : null;
    if (rawSpeed !== null) {
      speedHistory.push(rawSpeed);
      if (speedHistory.length > SPEED_BUFFER_SIZE) speedHistory.shift();
    }

    enqueuePoint({
      lat: data.lat, lng: data.lng,
      speed: data.speed || 0, heading: data.heading || 0,
      updatedAt: data.updatedAt || Date.now(),
    });

    document.getElementById('info').innerText        = '🟢 Link Connection Active';
    document.getElementById('etaCard').style.display = 'block';

    processRoadETA(data.lat, data.lng, data.speed, data.stopIndex, busKey);
  });
};

window.toggleTopbar = function () {
  const topbar = document.getElementById('topbar');
  const btn    = document.getElementById('togglePanelBtn');
  topbar.classList.toggle('collapsed');
  btn.innerHTML = topbar.classList.contains('collapsed') ? '▼' : '▲';
};