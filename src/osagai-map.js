import { define } from "osagai";
import { onConnected } from "osagai/lifecycles";
import { attachShadow, SHADOW_DOM } from "osagai/dom";

const API_URL = "https://maps.googleapis.com/maps/api/js?";
const API_VERSION = "3.exp";
const API_LIBRARIES = "drawing,geometry,places,visualization";
let isScriptCalled = false;
const scriptCallback = new Promise(function(resolve) {
  window.__initGoogleMapsApi = resolve;
});

function OsagaiMap({ element }) {
  const apiKey = element.getAttribute("api-key");
  const scriptPromise = loadScript(apiKey);
  attachShadow(element);

  onConnected(element, function mapConnected() {
    scriptPromise
      .then(function scriptLoaded() {
        initMap(element);
      })
      .catch(console.error);
  });

  return function() {
    return `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        div {
          width: 100%;
          height: 100%;
        }
      </style>

      <div id="map"></div>
    `;
  };
}

define("osagai-map", OsagaiMap);

function loadScript(apiKey) {
  if (isScriptCalled) {
    return scriptCallback;
  }

  const script = document.createElement("script");
  const url = `${API_URL}v=${API_VERSION}&libraries=${API_LIBRARIES}&key=${apiKey}&callback=__initGoogleMapsApi`;
  script.src = url;
  document.head.appendChild(script);
  isScriptCalled = true;

  return scriptCallback;
}

function initMap(element) {
  if (element.map) {
    return;
  }

  element.map = new google.maps.Map(
    element[SHADOW_DOM].querySelector("#map"),
    getMapOptions(element)
  );
  element.listeners = {};

  updateCenter(element);
  loadKml(element);
  updateMarkers(element);
  addMapListeners(element);

  dispatch(element, "ready");
}

function updateCenter(element) {
  if (map(element) && latitude(element) && longitude(element)) {
    const lat = latitude(element);
    const lng = longitude(element);

    const center = new google.maps.LatLng(lat, lng);
    const oldCenter = map(element).getCenter();

    if (!oldCenter) {
      map(element).setCenter(center);
    } else {
      const oldLatLng = new google.maps.LatLng(
        oldCenter.lat(),
        oldCenter.lng()
      );

      if (!oldLatLng.equals(center)) {
        map(element).panTo(center);
      }
    }
  }
}

function loadKml(element) {
  if (map(element) && kml(element)) {
    return new google.maps.KmlLayer({
      url: kml(element),
      map: map(element)
    });
  }
}

function updateMarkers() {
  console.log("Not implemented yet");
}

function addMapListeners(element) {
  google.maps.event.addListener(
    map(element),
    "center_changed",
    function centerChangedCallback() {
      const center = map(element).getCenter();
      setLatitude(element, center.lat());
      setLongitude(element, center.lng());
    }
  );
  google.maps.event.addListener(
    map(element),
    "zoom_changed",
    function zoomChangedCallback() {
      setZoom(element, map(element).getZoom());
    }
  );
  google.maps.event.addListener(
    map(element),
    "maptypeid_changed",
    function mapTypeIdChangedCallback() {
      setMapType(element, map(element).getMapTypeId());
    }
  );

  // TODO: implement click/drag/mouse events

  idleEvent(element);
}

function idleEvent(element) {
  if (map(element)) {
    forwardEvent(element, "idle");
  } else {
    clearListener(element, "idle");
  }
}

/**
 * GETTERS/SETTERS
 */
function listeners(element) {
  return element.listeners;
}
function map(element) {
  return element.map;
}
function latitude(element) {
  return Number(element.getAttribute("latitude"));
}
function setLatitude(element, value) {
  element.setAttribute("latitude", value);
}
function longitude(element) {
  return Number(element.getAttribute("longitude"));
}
function setLongitude(element, value) {
  element.setAttribute("longitude", value);
}
function kml(element) {
  return element.getAttribute("kml");
}
function zoom(element) {
  return Number(element.getAttribute("zoom")) || null;
}
function setZoom(element, value) {
  element.setAttribute("zoom", value);
}
function mapType(element) {
  return element.getAttribute("mapType");
}
function setMapType(element, value) {
  element.setAttribute("mapType", value);
}

function dispatch(element, name) {
  element.dispatchEvent(createEvent(name));
}

function createEvent(name, data) {
  return new CustomEvent("osagai-map-" + name, { detail: data });
}

function forwardEvent(element, name) {
  listeners(element)[name] = google.maps.event.addListener(
    map(element),
    name,
    function eventListenerCallback(event) {
      element.dispatchEvent(createEvent(name, event));
    }
  );
}
function clearListener(element, name) {
  if (listeners(element)[name]) {
    google.maps.event.removeListener(listeners(element)[name]);
    listeners(element)[name] = null;
  }
}

function getBooleanAttribute(element, attrName) {
  const attr = element.getAttribute(attrName);
  return attr === "true" || attr === "" ? true : false;
}

function getMapOptions(element) {
  return {
    zoom: zoom(element),
    tilt: getBooleanAttribute(element, "noAutoTilt") ? 0 : 45,
    mapTypeId: mapType(element),
    disableDefaultUI: getBooleanAttribute(element, "disableDefaultUi"),
    mapTypeControl:
      !getBooleanAttribute(element, "disableDefaultUi") &&
      !getBooleanAttribute(element, "disableMapTypeControl"),
    streetViewControl:
      !getBooleanAttribute(element, "disableDefaultUi") &&
      !getBooleanAttribute(element, "disableStreetViewControl"),
    disableDoubleClickZoom: getBooleanAttribute(element, "disableZoom"),
    scrollwheel: !getBooleanAttribute(element, "disableZoom"),
    styles: element.getAttribute("styles"),
    maxZoom: Number(element.getAttribute("maxZoom")),
    minZoom: Number(element.getAttribute("minZoom"))
  };
}
