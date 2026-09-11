import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { DataGrid, GRID_CHECKBOX_SELECTION_FIELD } from "@mui/x-data-grid";
import { Copy, MoreVertical, Pencil, Plane, Search, Ship, Trash2 } from "lucide-react";

function ModeEmptyIllustration({ mode }) {
  const isOcean = mode === "ocean";
  const Icon = isOcean ? Ship : Plane;
  const label = isOcean ? "Ocean empty state illustration" : "Air empty state illustration";

  return (
    <Box
      role="img"
      aria-label={label}
      sx={{ position: "relative", width: 132, height: 72, mb: 0.5, color: "primary.main" }}
    >
      <Box
        component="svg"
        viewBox="0 0 132 72"
        aria-hidden="true"
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <circle cx="66" cy="33" r="27" fill="#F5F9FF" />
        {isOcean ? (
          <>
            <circle cx="103" cy="15" r="7" fill="#EAF2FD" />
            <path d="M18 53c9-5 18-5 27 0s18 5 27 0 18-5 27 0 18 5 27 0" fill="none" stroke="#8FB3E7" strokeWidth="2" strokeLinecap="round" />
            <path d="M28 62c7-4 14-4 21 0s14 4 21 0 14-4 21 0 14 4 21 0" fill="none" stroke="#BFD3F2" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M18 51c20 14 43 14 63 0 14-10 23-24 32-37" fill="none" stroke="#BFD3F2" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 6" />
            <path d="M19 24h13M25.5 17.5v13" fill="none" stroke="#D7E5F8" strokeWidth="2" strokeLinecap="round" />
            <path d="M99 56h14M106 49v14" fill="none" stroke="#D7E5F8" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </Box>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: isOcean ? 25 : 22,
          transform: "translateX(-50%)",
          width: 48,
          height: 48,
          display: "grid",
          placeItems: "center",
          color: "primary.main",
          backgroundColor: "common.white",
          border: "1px solid",
          borderColor: "primary.100",
          borderRadius: "50%",
          boxShadow: "0 4px 14px rgba(35, 92, 157, 0.08)",
        }}
      >
        <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
      </Box>
    </Box>
  );
}

function NoRowsOverlay({ label, visual = "search", hint = "Try adjusting the search conditions." }) {
  const hasModeIllustration = visual === "ocean" || visual === "air";

  return (
    <Box className="data-grid-empty" sx={{ width: "100%", height: "100%", minHeight: hasModeIllustration ? 156 : 112, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: .5, px: 3, py: hasModeIllustration ? 2.5 : 2, textAlign: "center" }}>
      {hasModeIllustration ? (
        <ModeEmptyIllustration mode={visual} />
      ) : (
        <Box sx={{ width: 36, height: 36, mb: .5, display: "grid", placeItems: "center", color: "primary.main", backgroundColor: "primary.50", borderRadius: 2 }}><Search size={20} aria-hidden="true" /></Box>
      )}
      <Box component="strong" sx={{ color: "text.primary", fontSize: 14, lineHeight: "20px", fontWeight: 600 }}>{label}</Box>
      <Box component="span" sx={{ color: "text.secondary", fontSize: 12, lineHeight: "18px" }}>{hint}</Box>
    </Box>
  );
}

export function RowActionButton({ label, onClick }) {
  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
      <IconButton
        size="small"
        color="primary"
        aria-label={`${label} actions`}
        onClick={(event) => { event.stopPropagation(); onClick?.(event); }}
      >
        <MoreVertical size={19} />
      </IconButton>
    </Box>
  );
}

export function RowActionMenu({ label, anchorEl, onClose, onEdit, onDuplicate, onDelete }) {
  const open = Boolean(anchorEl);
  const closeMenu = (event) => {
    event?.stopPropagation();
    onClose?.();
  };
  const runAction = (handler) => (event) => {
    event.stopPropagation();
    onClose?.();
    handler?.();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={closeMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: { sx: { minWidth: 156, mt: .5, border: "1px solid", borderColor: "divider", borderRadius: "8px", boxShadow: "0 8px 24px rgba(16, 24, 40, .14)" } },
        list: { "aria-label": label + " actions menu", dense: true },
      }}
    >
      {onEdit ? (
        <MenuItem onClick={runAction(onEdit)} sx={{ minHeight: 40, gap: 1 }}>
          <ListItemIcon sx={{ minWidth: "28px !important" }}><Pencil size={16} /></ListItemIcon>
          <ListItemText primary="Edit" primaryTypographyProps={{ fontSize: 14 }} />
        </MenuItem>
      ) : null}
      {onDuplicate ? (
        <MenuItem onClick={runAction(onDuplicate)} sx={{ minHeight: 40, gap: 1 }}>
          <ListItemIcon sx={{ minWidth: "28px !important" }}><Copy size={16} /></ListItemIcon>
          <ListItemText primary="Duplicate" primaryTypographyProps={{ fontSize: 14 }} />
        </MenuItem>
      ) : null}
      {onDelete ? (
        <MenuItem onClick={runAction(onDelete)} sx={{ minHeight: 40, gap: 1, color: "error.main" }}>
          <ListItemIcon sx={{ minWidth: "28px !important", color: "inherit" }}><Trash2 size={16} /></ListItemIcon>
          <ListItemText primary="Delete" primaryTypographyProps={{ fontSize: 14 }} />
        </MenuItem>
      ) : null}
    </Menu>
  );
}

export function ManagementDataGrid({
  rows,
  columns,
  getRowId,
  onRowClick,
  onOpenRow,
  isRowOpenable = () => true,
  selectedId,
  selectedIds = [],
  onSelectedIdsChange,
  rowsPerPage = 10,
  noRowsLabel = "No matching records",
  emptyStateVisual = "search",
  emptyStateHint,
  ariaLabel = "Management records",
  sx,
  ...props
}) {
  const openRow = onOpenRow || onRowClick;
  const selectionEnabled = Boolean(onSelectedIdsChange);
  return (
    <Box className="management-grid" aria-label={ariaLabel} sx={{ height: rows.length === 0 && emptyStateVisual !== "search" ? 228 : Math.max(160, Math.min(rowsPerPage, rows.length) * 56 + 48) }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        rowHeight={56}
        columnHeaderHeight={48}
        hideFooter
        disableColumnResize={false}
        disableRowSelectionOnClick
        checkboxSelection={selectionEnabled}
        checkboxSelectionVisibleOnly
        disableRowSelectionExcludeModel
        {...(selectionEnabled ? {
          rowSelectionModel: { type: "include", ids: new Set(selectedIds) },
          onRowSelectionModelChange: (model) => onSelectedIdsChange([...model.ids]),
        } : {})}
        onCellClick={(params, event) => {
          if (![GRID_CHECKBOX_SELECTION_FIELD, "actions", "open"].includes(params.field) && isRowOpenable(params.row)) openRow?.(params.row, event);
        }}
        onCellKeyDown={(params, event) => {
          if (event.key === "Enter" && ![GRID_CHECKBOX_SELECTION_FIELD, "actions", "open"].includes(params.field) && isRowOpenable(params.row)) openRow?.(params.row, event);
        }}
        getRowClassName={(params) => [params.id === selectedId ? "selected-row" : "", openRow && !isRowOpenable(params.row) ? "is-static" : ""].filter(Boolean).join(" ")}
        slots={{ noRowsOverlay: () => <NoRowsOverlay label={noRowsLabel} visual={emptyStateVisual} hint={emptyStateHint} /> }}
        sx={{
          border: 0,
          "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8F9FA" },
          "& .MuiDataGrid-columnHeaderTitle": { color: "text.secondary", fontSize: 13, fontWeight: 700 },
          "& .MuiDataGrid-columnSeparator": { display: "flex", color: "primary.200", opacity: 0, transition: "opacity 150ms ease-out" },
          "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-columnSeparator, & .MuiDataGrid-columnSeparator.MuiDataGrid-columnSeparator--resizing": { opacity: 1 },
          "& .MuiDataGrid-cell": { display: "flex", alignItems: "center", color: "text.primary", borderBottom: 0, fontSize: 14 },
          "& .MuiDataGrid-row": { cursor: openRow ? "pointer" : "default" },
          "& .MuiDataGrid-row.is-static": { cursor: "default" },
          "& .MuiDataGrid-row:hover": { backgroundColor: "#F8F9FA" },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "2px solid #4D86D8", outlineOffset: -2 },
          "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover, & .MuiDataGrid-row.selected-row": { backgroundColor: "primary.50" },
          "& .MuiDataGrid-columnHeader[data-field='actions'], & .MuiDataGrid-columnHeader[data-field='open']": { position: "sticky", right: 0, zIndex: 3, backgroundColor: "background.paper" },
          "& .MuiDataGrid-cell[data-field='actions'], & .MuiDataGrid-cell[data-field='open']": { position: "sticky", right: 0, zIndex: 2, justifyContent: "flex-end", paddingRight: 1.5, backgroundColor: "background.paper", boxShadow: "-1px 0 0 #E5E9EC" },
          "& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='actions'], & .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='open']": { backgroundColor: "#F8F9FA" },
          "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell[data-field='actions'], & .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell[data-field='open']": { backgroundColor: "primary.50" },
          "& .MuiDataGrid-scrollbarFiller": { backgroundColor: "background.paper" },
          ...sx,
        }}
        {...props}
      />
    </Box>
  );
}
