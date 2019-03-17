import { define } from "osagai";
import { attachShadow } from "osagai/dom";
import { onConnected } from "osagai/lifecycles";
import { getBooleanAttribute, dispatch } from "./utils";

/**
 * Custom element for rendering a marker in a Google map. [Marker documentation](https://developers.google.com/maps/documentation/javascript/markers)
 *
 * @name osagai-map-marker
 * @param {Number} latitude Latitude to show in the map
 * @param {Number} longitude Longitude to show in the map
 * @param {String} [title=undefined] Title of the marker that will appear as a tooltip
 * @param {String} [animation=undefined] Animation to exhibit dynamic movement to the marker. Values supported from google maps api. [Animate marker docs](https://developers.google.com/maps/documentation/javascript/markers#animate)
 * @param {Boolean} [hidden=false] Hide the marker
 * @param {String} [label=undefined] A marker label that appear inside a marker
 */
function OsagaiMapMarker({ element }) {
  attachShadow(element);

  Object.defineProperties(element, {
    marker: {
      get: function() {
        return element._marker;
      },
      set: function(marker) {
        element._marker = marker;
      }
    },
    map: {
      get: function() {
        return element._map;
      },
      set: function(map) {
        element._map = map;

        mapChanged(element);
      }
    },
    open: {
      get: function() {
        return element._open;
      },
      set: function(open) {
        element._open = open;

        openChanged(element);
      }
    }
  });

  onConnected(element, function markerConnected() {
    if (element.marker) {
      element.marker.setMap(element.map);
    }
  });

  return function() {
    return `
      <style>
        :host {
          display: none;
        }
      </style>
    `;
  };
}

define("osagai-map-marker", OsagaiMapMarker);

function mapChanged(element) {
  if (element.marker) {
    element.marker.setMap(null);
    google.maps.event.clearInstanceListeners(element.marker);
  }

  if (element.map && element.map instanceof google.maps.Map) {
    mapReady(element);
  }
}

function mapReady(element) {
  element.listeners = {};
  element.marker = new google.maps.Marker({
    map: element.map,
    position: {
      lat: latitude(element),
      lng: longitude(element)
    },
    title: title(element),
    animation: animation(element),
    visible: !hidden(element),
    label: label(element)
  });

  contentChanged(element);
}

function contentChanged(element) {
  const content = element.innerHTML.trim();
  if (content) {
    if (!element.info) {
      element.info = new google.maps.InfoWindow();
      element.openInfoHandler = google.maps.event.addListener(
        element.marker,
        "click",
        function clickInfoWindow() {
          element.open = true;
        }
      );
      element.closeInfoHandler = google.maps.event.addListener(
        element.info,
        "closeclick",
        function closeInfoWindow() {
          element.open = false;
        }
      );
    }

    element.info.setContent(content);
  } else {
    if (element.info) {
      google.maps.event.removeListener(element.openInfoHandler);
      google.maps.event.removeListener(element.closeInfoHandler);
      element.info = null;
    }
  }
}

function openChanged(element) {
  if (element.info) {
    if (element.open) {
      element.info.open(element.map, element.marker);
      dispatch(element, "marker-open");
    } else {
      element.info.close();
      dispatch(element, "marker-close");
    }
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
function longitude(element) {
  return Number(element.getAttribute("longitude"));
}
function title(element) {
  return element.getAttribute("title");
}
function animation(element) {
  return element.getAttribute("animation");
}
function hidden(element) {
  return getBooleanAttribute(element, "hidden");
}
function label(element) {
  return element.getAttribute("label");
}
