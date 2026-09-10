import { createTheme } from "@mui/material/styles";

export const semanticColors = {
  brand: { light: "#FCE8EE", main: "#D20A3D", dark: "#AC0731" },
  primary: { light: "#EAF2FD", main: "#4D86D8", dark: "#346DBD" },
  billing: { light: "#F2ECFB", main: "#7A57B8", dark: "#5D3D91" },
  success: { light: "#E8F6F1", main: "#218A66", dark: "#187052" },
  warning: { light: "#FFF4E4", main: "#FF9818", dark: "#B66300" },
  error: { light: "#FDEEEE", main: "#D74747", dark: "#B73535" },
  neutral: { 100: "#F5F7F9", 300: "#E5E9EC", 400: "#BCC6D0", 700: "#63717C", 900: "#17242E" },
};

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: semanticColors.primary,
    secondary: { main: semanticColors.neutral[700] },
    success: semanticColors.success,
    warning: semanticColors.warning,
    error: semanticColors.error,
    background: { default: semanticColors.neutral[100], paper: "#FFFFFF" },
    text: { primary: semanticColors.neutral[900], secondary: semanticColors.neutral[700] },
    divider: semanticColors.neutral[300],
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans TC", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    h4: { fontSize: 28, lineHeight: "38px", fontWeight: 700 },
    h5: { fontSize: 22, lineHeight: "30px", fontWeight: 700 },
    h6: { fontSize: 18, lineHeight: "26px", fontWeight: 700 },
    body1: { fontSize: 14, lineHeight: "22px", fontWeight: 400 },
    body2: { fontSize: 13, lineHeight: "20px", fontWeight: 400 },
    button: { fontSize: 14, lineHeight: "20px", fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, borderRadius: 8 } },
    },
    MuiIconButton: {
      styleOverrides: { root: { width: 40, height: 40, borderRadius: 8 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { minHeight: 40, borderRadius: 8, backgroundColor: "#FFFFFF" } },
    },
    MuiFormLabel: {
      styleOverrides: { root: { fontSize: 14, lineHeight: "20px", fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { minHeight: 26, borderRadius: 6, fontSize: 12, fontWeight: 600 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: { borderColor: semanticColors.neutral[300], backgroundColor: "#FFFFFF" },
        columnHeaders: { minHeight: 48, maxHeight: 48, backgroundColor: "#F8FAFB" },
        columnHeaderTitle: { fontSize: 13, fontWeight: 700 },
        row: { minHeight: 56, maxHeight: 56 },
        cell: { minHeight: 56, maxHeight: 56, fontSize: 14, borderColor: semanticColors.neutral[300] },
      },
    },
  },
});
