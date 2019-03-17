export function getBooleanAttribute(element, attrName) {
  const attr = element.getAttribute(attrName);
  return attr === "true" || attr === "" ? true : false;
}

export function dispatch(element, name, data) {
  element.dispatchEvent(createEvent(name, data));
}

export function createEvent(name, data) {
  return new CustomEvent("osagai-map-" + name, { detail: data });
}
