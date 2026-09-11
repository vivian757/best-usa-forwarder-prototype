import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dirname);
const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5178/";
const checks = [
  ["scripts/sync-demo-artifacts.mjs", "--check"],
  ["qa-demo-data-consistency.mjs"],
  ["qa-domain-contract.mjs"],
  ["qa-shipment-operation-direction.mjs", url],
  ["qa-shipment-commercial-ownership.mjs", url],
  ["qa-field-format-consistency.mjs", url],
  ["qa-extracted-equipment-type.mjs", url],
  ["qa-quotation-additional-pricing-unit.mjs", url],
  ["qa-quotation-preview-export.mjs", url],
  ["qa-carrier-rate-service-type.mjs", url],
  ["qa-quotation-plan-select.mjs", url],
  ["qa-shipment-pricing-unit-edit.mjs", url],
  ["qa-generated-bol-draft.mjs", url],
  ["qa-bol-consignee-count.mjs", url],
  ["qa-billing-collapsed-default.mjs", url],
  ["qa-ocean-air-quotation-flow.mjs", url],
];

for (const [script, ...args] of checks) {
  console.log(`\nRunning ${script}`);
  const result = spawnSync(process.execPath, [resolve(appRoot, script), ...args], {
    cwd: appRoot,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`\nCurrent demo flow QA passed at ${url}`);
