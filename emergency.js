// ═══════════════════════════════════════════════════════
//  MODULE: emergency.js
//  Purpose: Emergency mode — GPS location + nearby facilities
//  Depends: ui.js
// ═══════════════════════════════════════════════════════

let userLat = null;
let userLng = null;

// ── Open the emergency overlay and start geo-detection ──
function openEmergency() {
  const overlay = document.getElementById('emergencyOverlay');
  overlay.classList.add('show');

  // Reset state
  document.getElementById('locationStatus').textContent = 'Detecting your location…';
  document.getElementById('locationDesc').textContent   = 'Please allow location access to find nearby hospitals and pharmacies within 5 km.';
  document.getElementById('nearbyLinks').innerHTML      = '';

  detectLocation();
}

// ── Use browser Geolocation API ──
function detectLocation() {
  if (!navigator.geolocation) {
    setLocationFallback('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      document.getElementById('locationStatus').textContent =
        `📍 Location found (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;
      document.getElementById('locationDesc').textContent =
        'Tap a button below to open Google Maps and find nearby hospitals, pharmacies, and clinics within 5 km.';
      renderNearbyButtons();
    },
    err => {
      const msgs = {
        1: 'Location permission denied. Using manual mode.',
        2: 'Location unavailable. Using manual search.',
        3: 'Location request timed out. Using manual mode.'
      };
      setLocationFallback(msgs[err.code] || 'Location unavailable.');
    },
    { timeout: 8000, maximumAge: 60000 }
  );
}

// ── Fallback when GPS is unavailable ──
function setLocationFallback(reason) {
  document.getElementById('locationStatus').textContent = `⚠️ ${reason}`;
  document.getElementById('locationDesc').textContent   =
    'You can still find nearby help using the buttons below — Google Maps will open with a search near you.';
  renderNearbyButtons();
}

// ── Render facility shortcut buttons ──
function renderNearbyButtons() {
  const loc  = userLat ? `/@${userLat},${userLng},14z` : '';
  const base = 'https://www.google.com/maps/search/';

  const facilities = [
    { label: 'Hospitals (5 km)',     query: 'hospitals+near+me',           icon: 'fa-hospital'             },
    { label: 'Pharmacies (5 km)',    query: 'pharmacy+near+me',            icon: 'fa-prescription-bottle'  },
    { label: 'Emergency Clinics',   query: 'emergency+clinic+near+me',    icon: 'fa-clinic-medical'       },
    { label: '24h Medical Stores',  query: '24+hour+medical+store+near+me',icon: 'fa-store'               }
  ];

  document.getElementById('nearbyLinks').innerHTML = facilities.map(f => `
    <a class="nearby-chip" href="${base}${f.query}${loc}" target="_blank" rel="noopener">
      <i class="fas ${f.icon}"></i> ${f.label}
    </a>`).join('');
}

// ── Open full Google Maps with hospital search ──
function openGoogleMapsNearby() {
  const url = userLat
    ? `https://www.google.com/maps/search/hospitals+near+me/@${userLat},${userLng},14z`
    : `https://www.google.com/maps/search/hospitals+near+me`;
  window.open(url, '_blank', 'noopener');
}

// ── Close emergency overlay ──
function closeEmergency() {
  document.getElementById('emergencyOverlay').classList.remove('show');
}

// ── Close on Escape key ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeEmergency();
});
