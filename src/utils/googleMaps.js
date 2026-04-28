// Using Leaflet + OpenStreetMap instead of Google Maps to provide a completely free, out-of-the-box map experience!

export const loadGoogleMapsScript = () => {
  return new Promise((resolve) => {
    // Leaflet and Leaflet.heat are loaded via CDN in index.html.
    // Give it a tiny delay to ensure window.L is ready
    const checkL = setInterval(() => {
      if (window.L && window.L.heatLayer) {
        clearInterval(checkL);
        resolve();
      }
    }, 50);
  });
};

export const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.display_name || "Location not found";
  } catch (error) {
    console.error("Geocoding error:", error);
    return "Unable to fetch address";
  }
};

export const getCoordinatesFromAddress = async (address) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

export const initializeMap = (elementId, center, zoom = 12) => {
  const container = document.getElementById(elementId);
  // Prevent "Map container is already initialized" error in React StrictMode
  if (container._leaflet_id) {
    container._leaflet_id = null;
    container.innerHTML = "";
  }

  const map = window.L.map(elementId).setView([center.lat, center.lng], zoom);

  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Google Maps compatibility alias
  map.panTo = function(pos) {
    this.setView([pos.lat, pos.lng]);
  };

  return map;
};

export const addMarker = (map, lat, lng, title, iconUrl, infoWindowContent) => {
  let markerIcon;
  if (iconUrl) {
    markerIcon = window.L.icon({
      iconUrl: iconUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  } else {
    markerIcon = new window.L.Icon.Default();
  }

  const marker = window.L.marker([lat, lng], { icon: markerIcon, title }).addTo(map);

  if (infoWindowContent) {
    marker.bindPopup(infoWindowContent);
  }

  // Google Maps compatibility alias
  marker.setPosition = function(pos) {
    this.setLatLng([pos.lat, pos.lng]);
  };

  return marker;
};

export const addDraggableMarker = (map, lat, lng, onPositionChange) => {
  const markerIcon = window.L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const marker = window.L.marker([lat, lng], { draggable: true, icon: markerIcon }).addTo(map);

  marker.on("dragend", (e) => {
    const position = e.target.getLatLng();
    onPositionChange({
      lat: position.lat,
      lng: position.lng,
    });
  });

  // Google Maps compatibility alias
  marker.setPosition = function(pos) {
    this.setLatLng([pos.lat, pos.lng]);
  };

  return marker;
};

export const getMarkerIcon = (status) => {
  const icons = {
    pending: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    assigned: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    inProgress: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    resolved: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  };
  return icons[status] || icons.pending;
};

export const createHeatmapLayer = (map, data) => {
  if (!window.L.heatLayer) return null;
  const heatData = data.map(point => [point.lat, point.lng, (point.weight || 1) * 0.5]);
  const heatmap = window.L.heatLayer(heatData, {
    radius: 35,
    blur: 25,
    maxZoom: 15,
  }).addTo(map);
  
  // Expose setMap method to mimic Google Maps API for cleanup
  heatmap.setMap = function(newMap) {
    if (newMap === null) {
      map.removeLayer(this);
    } else {
      this.addTo(newMap);
    }
  };

  return heatmap;
};
