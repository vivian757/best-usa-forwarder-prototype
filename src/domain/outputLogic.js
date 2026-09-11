const getModeDetailValue = (fieldValues = {}, shipment = {}, path, fallback = "") => {
  if (Object.prototype.hasOwnProperty.call(fieldValues, path)) return fieldValues[path];
  const sourcePath = path.replace(/^mode\./, "").split(".");
  const value = sourcePath.reduce((current, key) => current?.[key], shipment.modeDetails);
  return value ?? fallback;
};

export function buildShipmentBolDocuments(shipment, fieldValues = {}, { fixtureId = null, jobDraft = null } = {}) {
  if (!shipment) return [];
  const routeLocations = (shipment.route || "").split(" → ").filter(Boolean);
  const origin = routeLocations[0] || "Origin facility";
  const deliveryLocations = routeLocations.slice(1);
  const defaultStops = shipment.shipmentId === fixtureId && Array.isArray(jobDraft?.routeStops)
    ? jobDraft.routeStops
    : [
        { stopId: `${shipment.shipmentId}-PICKUP`, activity: "Pickup", company: origin, address: origin },
        ...(deliveryLocations.length ? deliveryLocations : [shipment.customer]).map((location, index) => ({
          stopId: `${shipment.shipmentId}-DELIVERY-${index + 1}`,
          activity: "Delivery",
          company: index === deliveryLocations.length - 1 ? shipment.customer : location,
          address: location,
        })),
      ];
  const routeStops = Array.isArray(fieldValues.routeStops) && fieldValues.routeStops.length ? fieldValues.routeStops : defaultStops;
  const cargoLines = Array.isArray(fieldValues.cargoLines) && fieldValues.cargoLines.length ? fieldValues.cargoLines : jobDraft?.cargoLines || [];
  const bolStops = routeStops.filter((stop) => stop.activity === "Delivery");
  return bolStops.map((stop, index) => {
    const assignedCargoLines = cargoLines.filter((line) => line.deliveryStopId === stop.stopId);
    return {
      ...stop,
      stopIndex: routeStops.findIndex((candidate) => candidate.stopId === stop.stopId),
      bolNumber: shipment.bolNumber ? `${shipment.bolNumber}-${String(index + 1).padStart(2, "0")}` : null,
      cargoLines: assignedCargoLines.length || bolStops.length > 1 ? assignedCargoLines : cargoLines.slice(0, 1),
    };
  });
}

export function getShipmentOutputDocument(shipment, fieldValues = {}) {
  if (shipment?.transportMode === "OCEAN") {
    return { code: "HBL", label: "House Bill of Lading", number: getModeDetailValue(fieldValues, shipment, "mode.house.hblNo", "Pending") };
  }
  if (shipment?.transportMode === "AIR") {
    return { code: "HAWB", label: "House Air Waybill", number: getModeDetailValue(fieldValues, shipment, "mode.house.hawbNo", "Pending") };
  }
  return { code: "BOL", label: "Bill of Lading", number: shipment?.bolNumber || "Pending" };
}
