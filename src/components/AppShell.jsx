import { useState } from "react";
import { Avatar, Box, Drawer, IconButton, Tooltip, Typography } from "@mui/material";
import { ChevronDown, ChevronLeft, ChevronRight, Menu as MenuIcon, UserRound } from "lucide-react";

export const SIDEBAR_WIDTH = 232;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

function Brand({ collapsed }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Box sx={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", color: "#fff", backgroundColor: "#D20A3D", borderRadius: "8px", fontSize: 15, fontWeight: 700 }}>
        B
      </Box>
      {!collapsed ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ color: "#fff", fontSize: 13, lineHeight: "18px", fontWeight: 700, letterSpacing: ".055em" }}>BEST USA</Typography>
          <Typography noWrap sx={{ mt: .25, color: "rgba(255,255,255,.56)", fontSize: 11, lineHeight: "16px" }}>Demo</Typography>
        </Box>
      ) : null}
    </Box>
  );
}

function SidebarContent({ modules, activeModule, onModuleChange, collapsed = false, onToggle, onNavigate }) {
  const [expandedGroups, setExpandedGroups] = useState({ shipments: true });
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const navigate = (key) => {
    onModuleChange(key);
    onNavigate?.();
  };

  return (
    <Box
      className="best-sidebar-shell"
      sx={{
        width,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        backgroundColor: "#18191B",
        transition: "width 200ms ease",
      }}
    >
      <Box sx={{ height: 68, flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", px: collapsed ? 0 : 2.5, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
        {!collapsed ? <Brand collapsed={false} /> : null}
        {onToggle ? (
          <Tooltip title={collapsed ? "Expand navigation" : "Collapse navigation"} placement="right">
            <IconButton
              size="small"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              onClick={onToggle}
              sx={{ position: collapsed ? "static" : "absolute", right: collapsed ? "auto" : 12, top: collapsed ? "auto" : 20, width: 28, height: 28, zIndex: 3, color: "rgba(255,255,255,.78)", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,.16)", boxShadow: "none", "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,.09)", borderColor: "rgba(255,255,255,.26)" } }}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>

      <Box component="nav" aria-label="Main navigation" sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", px: collapsed ? 1 : 1.5, pt: 1.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        {Object.entries(modules).map(([key, item]) => {
          const NavIcon = item.icon;
          const children = item.children || [];
          const childActive = children.some((child) => child.key === activeModule);
          const active = activeModule === key || childActive;
          const expanded = Boolean(expandedGroups[key] || childActive);

          if (children.length) {
            const activeChild = children.find((child) => child.key === activeModule);
            const parentAction = () => {
              if (collapsed) {
                navigate(activeChild?.key || item.defaultChild || children[0].key);
                return;
              }
              setExpandedGroups((current) => ({ ...current, [key]: !expanded }));
            };

            return (
              <Box key={key} sx={{ mb: .5 }}>
                <Tooltip title={collapsed ? activeChild?.label || item.label : ""} placement="right">
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-expanded={collapsed ? undefined : expanded}
                    aria-label={collapsed ? item.label : undefined}
                    onClick={parentAction}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        parentAction();
                      }
                    }}
                    sx={{
                      height: 44,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: collapsed ? 0 : 1.5,
                      px: collapsed ? 0 : 1.5,
                      borderRadius: "8px",
                      color: active ? "#fff" : "rgba(255,255,255,.72)",
                      backgroundColor: active ? "rgba(255,255,255,.09)" : "transparent",
                      cursor: "pointer",
                      "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,.09)" },
                      "&:focus-visible": { outline: "2px solid #7DA8E6", outlineOffset: -2 },
                    }}
                  >
                    <NavIcon size={20} style={{ flexShrink: 0 }} />
                    {!collapsed ? (
                      <>
                        <Typography noWrap sx={{ flex: 1, fontSize: 14, fontWeight: active ? 600 : 500 }}>{item.label}</Typography>
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </>
                    ) : null}
                  </Box>
                </Tooltip>
                {!collapsed && expanded ? (
                  <Box sx={{ mt: .5 }}>
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const childIsActive = activeModule === child.key;
                      return (
                        <Box
                          key={child.key}
                          role="button"
                          tabIndex={0}
                          aria-current={childIsActive ? "page" : undefined}
                          onClick={() => navigate(child.key)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(child.key);
                            }
                          }}
                          sx={{
                            minHeight: 36,
                            mb: .25,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            pl: 4.75,
                            pr: 1.5,
                            position: "relative",
                            borderRadius: "8px",
                            color: childIsActive ? "#fff" : "rgba(255,255,255,.62)",
                            backgroundColor: childIsActive ? "rgba(255,255,255,.07)" : "transparent",
                            cursor: "pointer",
                            "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,.07)" },
                            "&:focus-visible": { outline: "2px solid #7DA8E6", outlineOffset: -2 },
                            ...(childIsActive ? { "&::before": { content: "\"\"", width: 3, height: 18, position: "absolute", left: 0, borderRadius: 2, backgroundColor: "#D20A3D" } } : {}),
                          }}
                        >
                          <ChildIcon size={16} style={{ flexShrink: 0 }} />
                          <Typography noWrap sx={{ flex: 1, fontSize: 13, fontWeight: childIsActive ? 600 : 500 }}>{child.label}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                ) : null}
              </Box>
            );
          }

          return (
            <Tooltip key={key} title={collapsed ? item.label : ""} placement="right">
              <Box
                role="button"
                tabIndex={0}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(key);
                  }
                }}
                sx={{
                  height: 44,
                  mb: .5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? 0 : 1.5,
                  px: collapsed ? 0 : 1.5,
                  position: "relative",
                  borderRadius: "8px",
                  color: active ? "#fff" : "rgba(255,255,255,.72)",
                  backgroundColor: active ? "rgba(255,255,255,.09)" : "transparent",
                  cursor: "pointer",
                  "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,.09)" },
                  "&:focus-visible": { outline: "2px solid #7DA8E6", outlineOffset: -2 },
                  ...(active ? { "&::before": { content: "\"\"", width: 3, height: 20, position: "absolute", left: 0, borderRadius: 2, backgroundColor: "#D20A3D" } } : {}),
                }}
              >
                <NavIcon size={20} style={{ flexShrink: 0 }} />
                {!collapsed ? <Typography noWrap sx={{ flex: 1, fontSize: 14, fontWeight: active ? 600 : 500 }}>{item.label}</Typography> : null}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Box className="demo-user-profile" sx={{ flexShrink: 0, m: collapsed ? 1 : 1.5, mt: 1 }}>
        <Tooltip title={collapsed ? "Demo User · Operations" : ""} placement="right">
          <Box
            aria-label="Current demo user: Demo User, Operations"
            sx={{
              width: "100%",
              minHeight: collapsed ? 44 : 60,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 1.25,
              p: collapsed ? 0 : 1.5,
              color: "#fff",
              borderRadius: "8px",
              backgroundColor: "rgba(0,0,0,.12)",
            }}
          >
            <Avatar sx={{ width: 32, height: 32, flexShrink: 0, color: "rgba(255,255,255,.78)", backgroundColor: "rgba(255,255,255,.12)" }}>
              <UserRound size={17} />
            </Avatar>
            {!collapsed ? (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ color: "#fff", fontSize: 13, lineHeight: "18px", fontWeight: 600 }}>Demo User</Typography>
                <Typography noWrap sx={{ color: "rgba(255,255,255,.55)", fontSize: 11, lineHeight: "16px" }}>Operations</Typography>
              </Box>
            ) : null}
          </Box>
        </Tooltip>
      </Box>

    </Box>
  );
}

export function AppShell({ modules, activeModule, onModuleChange, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const desktopWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box className="app-shell direction-standard mui-app-shell" sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <Box component="aside" sx={{ width: desktopWidth, position: "fixed", inset: 0, right: "auto", zIndex: 20, display: { xs: "none", md: "block" }, overflow: "visible", transition: "width 200ms ease" }}>
        <SidebarContent modules={modules} activeModule={activeModule} onModuleChange={onModuleChange} collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />
      </Box>

      <Box className="mobile-app-bar" sx={{ display: { xs: "flex", md: "none" } }}>
        <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ color: "common.white" }}><MenuIcon size={20} /></IconButton>
        <Box><strong>BEST USA</strong><small>Demo</small></Box>
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: { sx: { width: SIDEBAR_WIDTH, border: 0, backgroundColor: "#18191B", overflow: "hidden", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } } },
          backdrop: { sx: { backgroundColor: "rgba(0,0,0,.60)" } },
        }}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        <SidebarContent modules={modules} activeModule={activeModule} onModuleChange={onModuleChange} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box component="main" className="mui-main-area" sx={{ minWidth: 0, minHeight: "100vh", ml: { xs: 0, md: `${desktopWidth}px` }, transition: "margin-left 200ms ease" }}>
        {children}
      </Box>
    </Box>
  );
}
