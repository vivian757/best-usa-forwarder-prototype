# BEST USA Forwarder Demo Prototype

## Run

```bash
npm install
npm run dev
```

## Scope

- React + Vite frontend-only prototype with MUI Material and MUI X Data Grid
- Synthetic JSON fixture
- Hi-fi Standard B2B SaaS visual and interaction treatment
- Shared theme and UI primitives exported from `src/components/index.jsx`
- Full-page DetailPage flow inside a collapsible AppShell; no detail Workbook/Drawer
- Shipment detail is one workspace: expandable Sources, 42-field form, Review, Save draft and Submit
- Quotations and Billing remain side-menu modules and related records, not linear shipment steps
- Shipments navigation with All shipments, Trucking, Ocean and Air views; Ocean and Air remain explicit scope empty states in this Trucking-first demo
- Shipments management and representative Shipment detail
- Baseline v0.3 field inventory: all 42 fields on one page with 8 section anchors
- Transport Mode, Service Type and Equipment Type shown as separate job attributes
- Documents, Review Issues, Commit and BOL preview
- Quotations, Operational Billing and connected reporting preview

This prototype does not perform real OCR, file upload, pricing or accounting.

Impeccable project data is centralized at the project root: `../../.impeccable/`.
