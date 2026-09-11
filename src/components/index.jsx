import { useEffect, useRef } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { semanticColors } from "../theme";

export function PageHeader({ title, onBack, primaryAction, status, titleAction, metadata }) {
  return (
    <Box component="header" className="page-header mui-page-header">
      <Box className="page-header-copy">
        {onBack ? <Button className="back-button" variant="text" startIcon={<ArrowLeft size={17} />} onClick={onBack}>Back to list</Button> : null}
        <Box className="page-title-line">
          <Typography component="h1" variant="h4" tabIndex={onBack ? -1 : undefined}>{title}</Typography>
          {status}
          {titleAction ? <Box className="page-title-action">{titleAction}</Box> : null}
        </Box>
        {metadata ? <Box className="page-metadata">{metadata}</Box> : null}
      </Box>
      {primaryAction ? <Box className="page-header-actions">{primaryAction}</Box> : null}
    </Box>
  );
}

export function StatusChip({ label, tone = "neutral", icon }) {
  const styles = {
    success: { color: semanticColors.success.dark, backgroundColor: semanticColors.success.light },
    warning: { color: semanticColors.warning.dark, backgroundColor: semanticColors.warning.light },
    error: { color: semanticColors.error.dark, backgroundColor: semanticColors.error.light },
    primary: { color: semanticColors.primary.dark, backgroundColor: semanticColors.primary.light },
    billing: { color: semanticColors.billing.dark, backgroundColor: semanticColors.billing.light },
    neutral: { color: semanticColors.neutral[700], backgroundColor: "#EEF1F3" },
  }[tone] || {};
  return <Chip size="small" icon={icon} label={label} sx={styles} />;
}

export function SourceDisclosure({ children, count }) {
  return (
    <Accordion className="source-disclosure" disableGutters elevation={0} slotProps={{ heading: { component: "div" } }}>
      <AccordionSummary expandIcon={<ChevronDown size={18} />} aria-controls="source-documents-content" id="source-documents-header">
        <Box>
          <Typography component="h2" variant="h6">Sources</Typography>
          <Typography component="p" variant="body2">Open the synthetic source set whenever you need to compare shipment details.</Typography>
        </Box>
        <StatusChip label={`${count} files`} tone="neutral" />
      </AccordionSummary>
      <AccordionDetails className="source-disclosure-content">{children}</AccordionDetails>
    </Accordion>
  );
}

export function DetailPage({ title, meta, onBack, children, footer, size = "wide", status, lastUpdated, lastUpdatedAction, headerActions, headerSummary, stickyHeader = false, compactHeader = false, hideBack = false }) {
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, [title]);
  return (
    <section className={`detail-page detail-page-${size} ${footer ? "detail-page-has-footer" : ""} ${stickyHeader ? "detail-page-sticky-header" : ""} ${compactHeader ? "detail-page-compact-header" : ""}`} aria-label={`${title} details`}>
      <header className="detail-page-header">
        <div className={`detail-header-row ${meta ? "" : "detail-header-row-single-line"}`}>
          {!hideBack ? (
            <Tooltip title="Back to list" placement="bottom">
              <IconButton aria-label="Back to list" onClick={onBack}><ArrowLeft size={19} /></IconButton>
            </Tooltip>
          ) : null}
          <div className="detail-title-block">
            <div>
              <h1 ref={titleRef} tabIndex="-1">{title}</h1>
              {status}
              {lastUpdated || lastUpdatedAction ? (
                <span className="detail-last-updated-group">
                  {lastUpdated ? <span className="detail-last-updated">Last updated {lastUpdated}</span> : null}
                  {lastUpdatedAction}
                </span>
              ) : null}
            </div>
            {meta ? <p>{meta}</p> : null}
          </div>
          {headerActions ? <div className="detail-header-actions">{headerActions}</div> : null}
        </div>
        {headerSummary ? <div className="detail-header-summary">{headerSummary}</div> : null}
      </header>
      <div className="detail-page-body">{children}</div>
      {footer ? <footer className="detail-action-bar">{footer}</footer> : null}
    </section>
  );
}

export function FeedbackSnackbar({ feedback, onClose }) {
  const severity = feedback?.tone === "critical" ? "error" : feedback?.tone === "success" ? "success" : feedback?.tone === "warning" ? "warning" : "info";
  const appearance = {
    info: { backgroundColor: semanticColors.primary.light, color: semanticColors.neutral[900], borderColor: "#BFD3F2", iconColor: semanticColors.primary.dark },
    success: { backgroundColor: semanticColors.success.light, color: semanticColors.neutral[900], borderColor: "#BEE1D3", iconColor: semanticColors.success.dark },
    warning: { backgroundColor: semanticColors.warning.light, color: semanticColors.neutral[900], borderColor: "#F2D5AA", iconColor: semanticColors.warning.dark },
    error: { backgroundColor: semanticColors.error.light, color: semanticColors.neutral[900], borderColor: "#F0C4C4", iconColor: semanticColors.error.dark },
    neutral: { backgroundColor: semanticColors.neutral[100], color: semanticColors.neutral[900], borderColor: semanticColors.neutral[300], iconColor: semanticColors.neutral[700] },
  }[feedback?.tone === "neutral" ? "neutral" : severity];
  return (
    <Snackbar key={feedback?.message || "closed"} open={Boolean(feedback)} autoHideDuration={4200} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
      <Alert
        key={feedback?.message}
        role={severity === "error" ? "alert" : "status"}
        severity={severity}
        variant="outlined"
        onClose={onClose}
        sx={{
          width: 400,
          maxWidth: "calc(100vw - 32px)",
          alignItems: "center",
          color: appearance.color,
          backgroundColor: appearance.backgroundColor,
          borderColor: appearance.borderColor,
          boxShadow: "0 8px 24px rgba(23, 36, 46, .12)",
          "& .MuiAlert-icon": { flexShrink: 0, alignItems: "center", py: 0, color: appearance.iconColor },
          "& .MuiAlert-message": { minWidth: 0, flex: 1, py: .5, fontSize: 14, lineHeight: "20px", whiteSpace: "normal", overflowWrap: "anywhere" },
          "& .MuiAlert-action": { flexShrink: 0, alignItems: "center", ml: 1.5, mr: 0, py: 0, color: appearance.iconColor },
        }}
      >
        {feedback?.message}
      </Alert>
    </Snackbar>
  );
}

export { ManagementDataGrid, RowActionButton, RowActionMenu } from "./DataGridPatterns";
export { AppliedFilterBar, BulkActionBar, DeleteConfirmDialog, ImportButton, MetricCard, MetricCard as MetricFilterCard, SearchSheet, TableToolbar } from "./ListPagePatterns";
export { AutocompleteInput, EnglishDateInput, EnglishDateTimeInput, FieldLabel, RadioInput, SelectInput, TextInput, TimeRangeInput } from "./FormControls";
export { AppShell, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./AppShell";
