import { define } from "osagai";
import { onConnected, onAttributeChanged } from "osagai/lifecycles";
import { attachShadow, SHADOW_DOM } from "osagai/dom";

const API_URL = "https://maps.googleapis.com/maps/api/js?";
const API_VERSION = "3.34";
const API_LIBRARIES = "drawing,geometry,places,visualization";
let isScriptCalled = false;
const scriptCallback = new Promise(function(resolve) {
  window.__initGoogleMapsApi = resolve;
});

OsagaiMap.observedAttributes = ["click-events", "drag-events", "mouse-events"];

/**
 * Custom element for rendering a map using [Google Maps API](https://developers.google.com/maps/documentation/)
 *
 * @name osagai-map
 * @param {String} api-key API key to be used on Google Maps. [Get API Key docs](https://developers.google.com/maps/documentation/javascript/get-api-key)
 * @param {String} [version=3.34] Version of the Google Maps API
 * @param {String} [libraries=drawing,geometry,places,visualization] Libraries to use on the Google Maps API, separated by ","
 * @param {Number} latitude Latitude to show in the map
 * @param {Number} longitude Longitude to show in the map
 * @param {Number} [zoom=undefined] Zoom to use in the map
 * @param {Boolean} [no-auto-tilt=false] Don't use a tilt
 * @param {String} map-type Type of the map to use (roadmap|satellite|hybrid|terrain). [mapTypes docs](https://developers.google.com/maps/documentation/javascript/maptypes)
 * @param {Boolean} [disable-default-ui=false] Disable default UIs
 * @param {Boolean} [disable-map-type-control=false] Disable the map type controls
 * @param {Boolean} [disable-street-view-control=false] Disable the street-view controls
 * @param {Boolean} [disable-zoom=false] Disable zoom capabilities (Double click and scroll whell)
 * @param {Number} [max-zoom=undefined] Max zoom allowed
 * @param {Number} [min-zoom=undefined] Min zoom allowed
 *
 */
function OsagaiMap({ element }) {
  const apiKey = element.getAttribute("api-key");
  const version = element.getAttribute("version");
  const libraries = element.getAttribute("libraries");
  const scriptPromise = loadScript(apiKey, version, libraries);
  attachShadow(element);

  onConnected(element, function mapConnected() {
    scriptPromise
      .then(function scriptLoaded() {
        initMap(element);
      })
      .catch(console.error);
  });

  onAttributeChanged(element, function mapAttributeChanged(attribute) {
    switch (attribute.name) {
      case "click-events":
        clickEventsChanged(element);
        break;
      case "drag-events":
        dragEventsChanged(element);
        break;
      case "mouse-events":
        mouseEventsChanged(element);
        break;
    }
  });

  return function() {
    return `
      <style>
        :host {
          position: relative;
          display: block;
          height: 100%;
        }
        #map {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
      </style>

      <div id="map"></div>
    `;
  };
}

define("osagai-map", OsagaiMap);

function loadScript(apiKey, version, libraries) {
  if (isScriptCalled) {
    return scriptCallback;
  }

  const script = document.createElement("script");
  const url = `${API_URL}v=${version || API_VERSION}&libraries=${libraries ||
    API_LIBRARIES}&key=${apiKey}&callback=__initGoogleMapsApi`;
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

  clickEventsChanged(element);
  dragEventsChanged(element);
  mouseEventsChanged(element);

  idleEvent(element);
}

function clickEventsChanged(element) {
  if (map(element)) {
    if (clickEvents(element)) {
      forwardEvent(element, "click");
      forwardEvent(element, "dblclick");
      forwardEvent(element, "rightclick");
    } else {
      clearListener(element, "click");
      clearListener(element, "dblclick");
      clearListener(element, "rightclick");
    }
  }
}

function dragEventsChanged(element) {
  if (map(element)) {
    if (dragEvents(element)) {
      forwardEvent(element, "drag");
      forwardEvent(element, "dragend");
      forwardEvent(element, "dragstart");
    } else {
      clearListener(element, "drag");
      clearListener(element, "dragend");
      clearListener(element, "dragstart");
    }
  }
}

function mouseEventsChanged(element) {
  if (map(element)) {
    if (mouseEvents(element)) {
      forwardEvent(element, "mousemove");
      forwardEvent(element, "mouseout");
      forwardEvent(element, "mouseover");
    } else {
      clearListener(element, "mousemove");
      clearListener(element, "mouseout");
      clearListener(element, "mouseover");
    }
  }
}

function idleEvent(element) {
  if (map(element)) {
    forwardEvent(element, "idle");
  } else {
    clearListener(element, "idle");
  }
}

/*
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
  return element.getAttribute("map-type");
}
function setMapType(element, value) {
  element.setAttribute("map-type", value);
}
function clickEvents(element) {
  return getBooleanAttribute(element, "click-events");
}
function dragEvents(element) {
  return getBooleanAttribute(element, "drag-events");
}
function mouseEvents(element) {
  return getBooleanAttribute(element, "mouse-events");
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
    tilt: getBooleanAttribute(element, "no-auto-tilt") ? 0 : 45,
    mapTypeId: mapType(element) || undefined,
    disableDefaultUI: getBooleanAttribute(element, "disable-default-ui"),
    mapTypeControl:
      !getBooleanAttribute(element, "disable-default-ui") &&
      !getBooleanAttribute(element, "disable-map-type-control"),
    streetViewControl:
      !getBooleanAttribute(element, "disable-default-ui") &&
      !getBooleanAttribute(element, "disable-street-view-control"),
    disableDoubleClickZoom: getBooleanAttribute(element, "disable-zoom"),
    scrollwheel: !getBooleanAttribute(element, "disable-zoom"),
    maxZoom: Number(element.getAttribute("max-zoom")) || undefined,
    minZoom: Number(element.getAttribute("min-zoom")) || undefined
  };
}
