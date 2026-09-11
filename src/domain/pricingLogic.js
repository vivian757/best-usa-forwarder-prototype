import {
  formatPricingConditions,
  getPricingConditionKey,
  matchesPricingConditions,
  mergeCanonicalPricingRule,
  normalizePricingConditions,
} from "../data/pricingModel";

const pricingRuleTypeLabels = {
  flat_rate: "Flat rate",
  per_unit: "Per unit",
  tiered_rate: "Tiered rate",
  percentage_surcharge: "Percentage surcharge",
  threshold_time: "Threshold + time",
};

const pricingUnits = new Set([
  "SHIPMENT", "TRUCK", "STOP", "DELIVERY", "APPOINTMENT", "CONTAINER",
  "PALLET", "UNIT", "HOUR", "DAY", "30_MIN", "CHARGE_SUBTOTAL",
]);

export function inferPricingUnit(rule = {}, fallback = "SHIPMENT") {
  if (rule.billingUnit) return String(rule.billingUnit).toUpperCase();
  const descriptor = [rule.basis, rule.unit, rule.trigger, rule.source].filter(Boolean).join(" ").toLowerCase();
  if (descriptor.includes("30 min")) return "30_MIN";
  if (descriptor.includes("percent")) return "CHARGE_SUBTOTAL";
  if (descriptor.includes("additional stop")) return "STOP";
  if (descriptor.includes("appointment")) return "APPOINTMENT";
  if (descriptor.includes("delivery")) return "DELIVERY";
  if (descriptor.includes("container")) return "CONTAINER";
  if (descriptor.includes("truck")) return "TRUCK";
  if (descriptor.includes("pallet")) return "PALLET";
  if (descriptor.includes("shipment")) return "SHIPMENT";
  if (descriptor.includes("hour")) return "HOUR";
  if (descriptor.includes("day")) return "DAY";
  const rawUnit = String(rule.unit || "").toUpperCase();
  return pricingUnits.has(rawUnit) ? rawUnit : fallback;
}

export function inferPricingRuleType(rule = {}, fallback = "flat_rate") {
  if (rule.ruleType) return rule.ruleType;
  const descriptor = [rule.unit, rule.trigger, rule.source, rule.basis].filter(Boolean).join(" ").toLowerCase();
  if (descriptor.includes("percent")) return "percentage_surcharge";
  if (descriptor.includes("free min") || descriptor.includes("30 min")) return "threshold_time";
  if (/additional stop|per delivery|per appointment|per container/.test(descriptor)) return "per_unit";
  if (/tier|weight|pallet count/.test(descriptor)) return "tiered_rate";
  return fallback;
}

export function inferPricingConditionLabel(rule = {}, fallback = "All shipments") {
  if (rule.appliesWhen) return rule.appliesWhen;
  const descriptor = String(rule.trigger || rule.source || "").trim().toLowerCase();
  if (descriptor.includes("additional stop")) return "Each delivery stop after the first";
  if (descriptor.includes("appointment")) return "Each appointment";
  if (descriptor.includes("per delivery")) return "Each delivery";
  if (descriptor.includes("per container")) return "Each container";
  if (descriptor.includes("after 30 free min")) return "After 30 free min";
  return fallback;
}

export function normalizePricingRule(rule = {}, fallback = {}) {
  const rateCategory = rule.rateCategory || fallback.rateCategory || (rule.code?.startsWith("BASE_") ? "base" : "additional");
  const inferredRuleType = inferPricingRuleType(rule, fallback.ruleType || "flat_rate");
  const ruleType = rateCategory === "base" && inferredRuleType === "tiered_rate" ? "flat_rate" : inferredRuleType;
  const legacyAppliesWhen = rule.appliesWhen;
  const normalizedConditions = normalizePricingConditions(
    { ...rule, appliesWhen: legacyAppliesWhen },
    fallback.conditionLabel || inferPricingConditionLabel(rule, "All shipments"),
  );
  const conditionKey = getPricingConditionKey(normalizedConditions);
  const canonicalRule = { ...rule };
  delete canonicalRule.appliesWhen;
  delete canonicalRule.templateKey;
  return {
    ...canonicalRule,
    sourceType: rule.sourceType || fallback.sourceType || "RATE_PLAN",
    name: rule.name || rule.description || "",
    ruleType,
    ruleTypeLabel: pricingRuleTypeLabels[ruleType] || rule.ruleTypeLabel || "Flat rate",
    billingUnit: inferPricingUnit(rule, fallback.billingUnit || "SHIPMENT"),
    equipmentType: rule.equipmentType ?? fallback.equipmentType ?? null,
    conditions: ["residential_delivery", "high_value"].includes(conditionKey) ? [] : normalizedConditions,
    rateCategory,
    rate: Number(rule.rate ?? rule.unitPrice ?? rule.amount) || 0,
  };
}

export function getBasePricingFeeItemName({ serviceType, loadType, transportMode } = {}) {
  const normalizedLoadType = String(loadType || serviceType || "").trim();
  if (normalizedLoadType) return /freight$/i.test(normalizedLoadType) ? `Base ${normalizedLoadType}` : `Base ${normalizedLoadType} freight`;
  if (transportMode === "OCEAN") return "Base ocean freight";
  if (transportMode === "AIR") return "Base air freight";
  return "Base freight";
}

export function getChargeLineQuantity(line = {}) {
  const quantity = Number(line.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

export function getChargeLineUnitPrice(line = {}) {
  if (line.unitPrice !== null && line.unitPrice !== undefined) return Number(line.unitPrice) || 0;
  if (line.rate !== null && line.rate !== undefined) return Number(line.rate) || 0;
  return (Number(line.amount) || 0) / getChargeLineQuantity(line);
}

export function getChargeLineAmount(line = {}) {
  return getChargeLineQuantity(line) * getChargeLineUnitPrice(line);
}

export function sumChargeLines(result = {}, adjustments = []) {
  return [...(result.chargeLines || []), ...adjustments].reduce((sum, line) => sum + getChargeLineAmount(line), 0);
}

const getLoadType = (record = {}) => record.transportMode === "AIR" ? null : record.loadType || record.serviceType || null;

export function createPricingResultFromRatePlan(shipment, ratePlan) {
  if (!shipment || !ratePlan) return null;
  const shipmentEquipmentType = shipment.equipmentType || shipment.equipmentRequirements?.[0]?.type;
  const baseRule = ratePlan.rateMatrix?.find((rule) => (
    (!rule.equipmentType || !shipmentEquipmentType || rule.equipmentType === shipmentEquipmentType)
    && matchesPricingConditions(rule.conditions, {
      loadType: getLoadType(shipment),
      serviceType: shipment.serviceType,
      transportMode: shipment.transportMode,
      equipmentType: shipmentEquipmentType,
    })
  )) || ratePlan.rateMatrix?.[0];
  const normalizedBaseRule = baseRule ? normalizePricingRule(baseRule, {
    billingUnit: baseRule.basis === "Per truck" ? "TRUCK" : baseRule.basis === "Per container" ? "CONTAINER" : "SHIPMENT",
    conditionLabel: getLoadType(shipment) ? `${getLoadType(shipment)} shipments` : "All shipments",
    rateCategory: "base",
  }) : null;
  const baseAmount = Number(baseRule?.rate) || 0;
  const applicableSurcharges = (ratePlan.surchargeRules || [])
    .map((rule) => normalizePricingRule(rule, { ruleType: "per_unit" }))
    .filter((rule) => rule.ruleType !== "threshold_time");
  const transportServiceGroup = shipment.transportMode === "OCEAN" ? "Ocean" : shipment.transportMode === "AIR" ? "Air" : "Trucking";
  return {
    ratePlanId: ratePlan.quoteId,
    currency: ratePlan.currency || "USD",
    calculationStatus: "estimated",
    inputs: [
      { label: "Actual weight", value: "Pending actuals" },
      { label: "Billable weight", value: baseRule?.tier || "Pending actuals" },
      { label: "Rate lane", value: baseRule?.lane || ratePlan.serviceScope },
    ],
    chargeLines: [
      ...(baseRule ? [{
        sourceType: normalizedBaseRule.sourceType,
        code: `BASE_${getLoadType(shipment) || "FREIGHT"}`,
        description: baseRule.name || getBasePricingFeeItemName(shipment),
        pricingDetail: baseRule.tier || formatPricingConditions(normalizedBaseRule.conditions),
        ruleType: normalizedBaseRule.ruleType,
        ruleTypeLabel: normalizedBaseRule.ruleTypeLabel,
        equipmentType: normalizedBaseRule.equipmentType,
        conditions: normalizedBaseRule.conditions,
        rateCategory: "base",
        serviceGroup: transportServiceGroup,
        billingUnit: normalizedBaseRule.billingUnit,
        unitPrice: baseAmount,
        amount: baseAmount,
      }] : []),
      ...applicableSurcharges.map((rule) => {
        const unitPrice = rule.ruleType === "percentage_surcharge" ? baseAmount * (Number(rule.rate) || 0) / 100 : Number(rule.rate) || 0;
        return {
          sourceType: rule.sourceType,
          code: rule.code,
          description: rule.name,
          pricingDetail: formatPricingConditions(rule.conditions),
          ruleType: rule.ruleType,
          ruleTypeLabel: rule.ruleTypeLabel,
          equipmentType: rule.equipmentType,
          conditions: rule.conditions,
          rateCategory: "additional",
          serviceGroup: transportServiceGroup,
          quantity: 1,
          billingUnit: rule.billingUnit,
          unitPrice,
          amount: unitPrice,
        };
      }),
    ],
    vendorCost: { currency: ratePlan.currency || "USD", calculationStatus: "estimated", chargeLines: [], initialAdjustments: [] },
  };
}

export function applyQuotationPlan(pricingResult, ratePlan) {
  if (!pricingResult || !ratePlan) return pricingResult;
  if (pricingResult.ratePlanId !== ratePlan.quoteId) {
    const serviceType = pricingResult.chargeLines?.find((line) => line.code?.startsWith("BASE_"))?.code?.replace("BASE_", "") || getLoadType(ratePlan) || "FREIGHT";
    const replacementResult = createPricingResultFromRatePlan({ transportMode: ratePlan.transportMode, loadType: ratePlan.loadType, serviceType }, ratePlan);
    return { ...pricingResult, ...replacementResult, inputs: pricingResult.inputs, vendorCost: pricingResult.vendorCost };
  }
  const rateLane = pricingResult.inputs?.find((input) => input.label === "Rate lane")?.value;
  const billableWeightText = pricingResult.inputs?.find((input) => input.label === "Billable weight")?.value || "";
  const billableWeight = Number(billableWeightText.replace(/[^\d.]/g, ""));
  const loadType = pricingResult.chargeLines?.find((line) => line.code?.startsWith("BASE_"))?.code?.replace("BASE_", "");
  const matchingMatrixRule = ratePlan.rateMatrix?.find((rule) => {
    if (rateLane && rule.lane !== rateLane) return false;
    return matchesPricingConditions(rule.conditions, { loadType, serviceType: loadType, transportMode: ratePlan.transportMode, billableWeightLb: billableWeight || undefined });
  }) || ratePlan.rateMatrix?.[0];
  const baseAmount = matchingMatrixRule?.rate;
  const normalizedBaseRule = matchingMatrixRule ? normalizePricingRule(matchingMatrixRule, {
    billingUnit: matchingMatrixRule.basis === "Per truck" ? "TRUCK" : matchingMatrixRule.basis === "Per container" ? "CONTAINER" : "SHIPMENT",
    conditionLabel: getLoadType(ratePlan) ? `${getLoadType(ratePlan)} shipments` : "All shipments",
    rateCategory: "base",
  }) : null;
  return {
    ...pricingResult,
    ratePlanId: ratePlan.quoteId,
    currency: ratePlan.currency || pricingResult.currency,
    chargeLines: pricingResult.chargeLines.map((line) => {
      if (line.code.startsWith("BASE_") && baseAmount !== undefined) {
        return {
          ...line,
          sourceType: normalizedBaseRule.sourceType,
          description: matchingMatrixRule.name || line.description,
          ruleType: normalizedBaseRule.ruleType,
          ruleTypeLabel: normalizedBaseRule.ruleTypeLabel,
          billingUnit: normalizedBaseRule.billingUnit,
          equipmentType: normalizedBaseRule.equipmentType,
          conditions: normalizedBaseRule.conditions,
          rateCategory: "base",
          pricingDetail: matchingMatrixRule.tier || formatPricingConditions(normalizedBaseRule.conditions),
          unitPrice: baseAmount,
          amount: baseAmount,
        };
      }
      const surcharge = ratePlan.surchargeRules?.find((rule) => rule.code === line.code);
      if (!surcharge) return line;
      const normalizedSurcharge = normalizePricingRule(surcharge, { ruleType: "per_unit" });
      return {
        ...line,
        sourceType: normalizedSurcharge.sourceType,
        quantity: 1,
        billingUnit: normalizedSurcharge.billingUnit,
        unitPrice: surcharge.rate,
        amount: surcharge.rate,
        equipmentType: normalizedSurcharge.equipmentType,
        conditions: normalizedSurcharge.conditions,
        rateCategory: "additional",
        pricingDetail: formatPricingConditions(normalizedSurcharge.conditions),
        ruleType: normalizedSurcharge.ruleType,
        ruleTypeLabel: normalizedSurcharge.ruleTypeLabel,
      };
    }),
  };
}

export function applyVendorRatePlan(pricingResult, vendorRatePlan, canonicalPlan = null) {
  if (!pricingResult || !vendorRatePlan) return pricingResult;
  const canonicalLines = canonicalPlan?.chargeLines || pricingResult.vendorCost?.chargeLines || [];
  const sourceLines = vendorRatePlan.chargeLines || vendorRatePlan.pricingRules || canonicalLines;
  const chargeLines = sourceLines.map((line, index) => {
    const canonicalLine = canonicalLines.find((candidate) => candidate.code === line.code) || canonicalLines[index] || {};
    const mergedLine = mergeCanonicalPricingRule(line, canonicalLine);
    return normalizePricingRule(mergedLine, {
      ruleType: canonicalLine.ruleType || "flat_rate",
      billingUnit: canonicalLine.billingUnit || "SHIPMENT",
      conditionLabel: formatPricingConditions(canonicalLine.conditions) || "All shipments",
      rateCategory: canonicalLine.rateCategory || "additional",
      equipmentType: canonicalLine.equipmentType ?? null,
    });
  });
  return { ...pricingResult, vendorCost: { ...pricingResult.vendorCost, ...vendorRatePlan, chargeLines } };
}
