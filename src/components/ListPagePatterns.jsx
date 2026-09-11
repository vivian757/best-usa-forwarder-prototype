import { Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, FormControl, IconButton, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

export function ImportButton({ children = "Import", ...props }) {
  return <Button variant="outlined" color="primary" startIcon={<Download size={17} />} {...props}>{children}</Button>;
}

export function MetricCard({ label, value, color = "text.primary", active = false, filterValue, onSelect, icon: Icon, tone = "primary" }) {
  if (onSelect) {
    const nextValue = active && filterValue !== "all" ? "all" : filterValue;
    return (
      <ButtonBase
        className={`summary-card metric-filter-card metric-tone-${tone} ${active ? "active" : ""}`}
        aria-label={`${label}: ${value} records`}
        aria-pressed={active}
        onClick={() => onSelect(nextValue)}
      >
        <span className="metric-card-label">{label}</span>
        {Icon ? <span className="metric-card-icon"><Icon size={16} aria-hidden="true" /></span> : null}
        <strong>{value}</strong>
      </ButtonBase>
    );
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: "divider", borderRadius: 2 }}>
      <Typography color="text.secondary" sx={{ fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ mt: .5, color, fontSize: 27, lineHeight: "34px", fontWeight: 700 }}>{value}</Typography>
    </Paper>
  );
}

export function TableToolbar({ rowsPerPage, onRowsPerPageChange, total, from, to, page, pageCount, onPreviousPage, onNextPage, onOpenSearch, searchOnly = false, leadingActions = null, title = null }) {
  return (
    <Box className={`management-table-toolbar ${searchOnly ? "search-only" : ""} ${title ? "has-title" : ""}`}>
      {searchOnly && title ? <Typography className="management-table-toolbar-title">{title}</Typography> : null}
      {!searchOnly ? (
        <FormControl size="small" sx={{ minWidth: 104, height: 40, justifyContent: "center" }}>
          <Select value={rowsPerPage} onChange={(event) => onRowsPerPageChange(Number(event.target.value))} aria-label="Rows per page" sx={{ height: 40, fontSize: 14, "& .MuiSelect-select": { display: "flex", alignItems: "center", height: 40, boxSizing: "border-box", py: 0 } }}>
            {[5, 10, 25, 30].map((value) => <MenuItem key={value} value={value}>{value} / page</MenuItem>)}
          </Select>
        </FormControl>
      ) : null}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 40, flexShrink: 0 }}>
        {!searchOnly ? (
          <>
            <Typography sx={{ height: 40, display: "flex", alignItems: "center", mr: 1, fontSize: 14, lineHeight: "20px", whiteSpace: "nowrap" }}>{total ? `${from}–${to} of ${total}` : "0 of 0"}</Typography>
            <IconButton aria-label="Previous page" onClick={onPreviousPage} disabled={!total || page <= 0} sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2 }}>
              <ChevronLeft size={20} aria-hidden="true" />
            </IconButton>
            <IconButton aria-label="Next page" onClick={onNextPage} disabled={!total || page >= pageCount - 1} sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2 }}>
              <ChevronRight size={20} aria-hidden="true" />
            </IconButton>
          </>
        ) : null}
        {searchOnly ? leadingActions : null}
        <IconButton aria-label="Search records" onClick={onOpenSearch} sx={{ width: 40, height: 40, flexShrink: 0, color: "primary.main", borderRadius: 2, "&:hover": { backgroundColor: "primary.100" } }}><Search size={21} aria-hidden="true" /></IconButton>
      </Stack>
    </Box>
  );
}

export function AppliedFilterBar({ filters, onRemove, onOpenSearch }) {
  if (!filters.length) return null;
  return (
    <Box className="applied-filter-bar" aria-label="Applied filters">
      {filters.map((filter) => (
        <Chip
          className="applied-filter-chip"
          key={filter.key}
          label={filter.label}
          onClick={onOpenSearch}
          onDelete={() => onRemove(filter.key)}
        />
      ))}
    </Box>
  );
}

export function BulkActionBar({ count, children, onClear }) {
  return (
    <Box className="bulk-action-bar">
      <Typography
        sx={{
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          fontSize: 14,
          lineHeight: "20px",
        }}
      >
        Selected {count}
      </Typography>
      {onClear || children ? (
        <Stack direction="row" spacing={1} alignItems="center">
          {onClear ? <Button variant="text" color="secondary" onClick={onClear}>Clear selection</Button> : null}
          {children}
        </Stack>
      ) : null}
    </Box>
  );
}

export function SearchSheet({ open, onClose, onReset, onSearch, children }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 400, maxWidth: "100vw", borderRadius: 0, boxShadow: 8 } }, backdrop: { sx: { backgroundColor: "rgba(0,0,0,.60)" } } }}>
      <Stack sx={{ height: "100%", p: { xs: 3, sm: 4 } }}>
        <Box component="header" sx={{ position: "relative", minHeight: 40, mb: 4, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: "28px" }}>Search</Typography>
          <Button variant="outlined" onClick={onReset} sx={{ position: "absolute", top: 0, right: 0, minWidth: 64 }}>Reset</Button>
        </Box>
        <Stack spacing={3} sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: .5 }}>{children}</Stack>
        <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexShrink: 0 }}><Button fullWidth variant="outlined" onClick={onClose}>Cancel</Button><Button fullWidth variant="contained" onClick={onSearch}>Search</Button></Stack>
      </Stack>
    </Drawer>
  );
}

export function DeleteConfirmDialog({ open, title, description, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3, pb: 1.5 }}>{title}</DialogTitle>
      <DialogContent sx={{ px: 4, pb: 3 }}><Typography sx={{ color: "text.secondary", fontSize: 14 }}>{description}</Typography></DialogContent>
      <DialogActions sx={{ px: 4, pb: 3 }}>
        <Button variant="outlined" color="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
