import { useEffect, useId, useState } from "react";
import { Autocomplete, Box, FormControl, FormControlLabel, FormHelperText, MenuItem, OutlinedInput, Radio, RadioGroup, Select, TextField, Typography } from "@mui/material";
import { semanticColors } from "../theme";

export function FieldLabel({ children, required = false, htmlFor, id }) {
  return (
    <Typography component={htmlFor ? "label" : "span"} htmlFor={htmlFor} id={id} sx={{ display: "block", mb: 1, color: "text.secondary", fontSize: 14, fontWeight: 600, lineHeight: "20px" }}>
      {children}{required ? <Box component="span" sx={{ ml: .5, color: "error.main" }}>*</Box> : null}
    </Typography>
  );
}

export function RadioInput({ label, required = false, error = false, helperText, options, value, onChange, sx }) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  return (
    <Box className="best-form-control" sx={sx}>
      {label ? <FieldLabel id={labelId} required={required}>{label}</FieldLabel> : null}
      <FormControl error={error} fullWidth>
        <RadioGroup row aria-labelledby={label ? labelId : undefined} value={value || ""} onChange={onChange} sx={{ minHeight: 40, alignItems: "center", gap: 2 }}>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size="small" sx={{ p: .75, mr: .25 }} />}
              label={option.label}
              sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: 14, lineHeight: "20px" } }}
            />
          ))}
        </RadioGroup>
        {helperText ? <FormHelperText sx={{ minHeight: 16, mx: 0, mt: .75 }}>{helperText}</FormHelperText> : null}
      </FormControl>
    </Box>
  );
}

const fieldOutlineSx = {
  "& .MuiOutlinedInput-notchedOutline": { borderColor: semanticColors.neutral[400] },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "text.secondary" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main", borderWidth: 1 },
  "&.Mui-disabled": { backgroundColor: "#F1F3F4" },
};

const warningOutlineSx = {
  backgroundColor: "background.paper",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "warning.dark" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "warning.dark" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "warning.dark", borderWidth: 1 },
};

export function TextInput({
  label,
  required = false,
  error = false,
  warning = false,
  helperText,
  multiline = false,
  minRows,
  rows,
  placeholder = "Please enter",
  sx,
  inputSx,
  inputProps = {},
  slotProps = {},
  ...props
}) {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  return (
    <Box className={`best-form-control ${warning ? "field-warning" : ""}`} sx={sx}>
      {label ? <FieldLabel required={required} htmlFor={inputId}>{label}</FieldLabel> : null}
      <OutlinedInput
        {...props}
        id={inputId}
        required={required}
        error={error}
        fullWidth
        multiline={multiline}
        minRows={minRows || rows}
        placeholder={placeholder}
        slotProps={{ ...slotProps, input: { ...inputProps, ...slotProps.input } }}
        sx={{
          ...fieldOutlineSx,
          minHeight: multiline ? 96 : 40,
          alignItems: multiline ? "flex-start" : "center",
          ...(warning && !error ? warningOutlineSx : {}),
          p: multiline ? 1.5 : 0,
          "& .MuiOutlinedInput-input": { boxSizing: "border-box", height: multiline ? "auto" : 40, p: multiline ? 0 : "10px 12px", fontSize: 14, lineHeight: "20px" },
          "& input[type=number]": { MozAppearance: "textfield" },
          "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": { m: 0, WebkitAppearance: "none" },
          ...inputSx,
        }}
      />
      {helperText ? <FormHelperText error={error} sx={{ minHeight: 16, mx: 0, mt: .75, color: warning ? "warning.dark" : undefined }}>{helperText}</FormHelperText> : null}
    </Box>
  );
}

function formatEnglishTime(value = "") {
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = match[2];
  if (hour > 23) return "";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

function parseEnglishTime(value = "") {
  const normalized = String(value).trim().toUpperCase();
  const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (twelveHourMatch) {
    const displayHour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    if (displayHour < 1 || displayHour > 12 || minute > 59) return null;
    const hour = (displayHour % 12) + (twelveHourMatch[3] === "PM" ? 12 : 0);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) return null;
  const hour = Number(twentyFourHourMatch[1]);
  const minute = Number(twentyFourHourMatch[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function EnglishTimeInput({ label, value, onChange, ariaLabel }) {
  const [draftValue, setDraftValue] = useState(() => formatEnglishTime(value));

  useEffect(() => {
    setDraftValue(formatEnglishTime(value));
  }, [value]);

  const commitValue = () => {
    const parsedValue = parseEnglishTime(draftValue);
    if (parsedValue === null) {
      setDraftValue(formatEnglishTime(value));
      return;
    }
    setDraftValue(formatEnglishTime(parsedValue));
    if (parsedValue !== value) onChange?.({ target: { value: parsedValue } });
  };

  return (
    <OutlinedInput
      fullWidth
      type="text"
      inputMode="text"
      autoComplete="off"
      placeholder={label}
      value={draftValue}
      slotProps={{ input: { "aria-label": ariaLabel, spellCheck: false } }}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.target.blur();
        if (event.key === "Escape") {
          setDraftValue(formatEnglishTime(value));
          event.target.blur();
        }
      }}
      sx={{
        ...fieldOutlineSx,
        minHeight: 40,
        "& .MuiOutlinedInput-input": { boxSizing: "border-box", height: 40, p: "10px 12px", fontSize: 14, lineHeight: "20px" },
      }}
    />
  );
}

export function TimeRangeInput({
  label,
  required = false,
  error = false,
  helperText,
  startValue = "",
  endValue = "",
  onStartChange,
  onEndChange,
  step = 300,
  sx,
}) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  return (
    <Box className="best-form-control" sx={sx}>
      {label ? <FieldLabel id={labelId} required={required}>{label}</FieldLabel> : null}
      <Box
        className={`time-range-input-control ${error ? "is-error" : ""}`}
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Time range"}
      >
        <EnglishTimeInput label="Start" ariaLabel="Start time" value={startValue} onChange={onStartChange} step={step} />
        <EnglishTimeInput label="End" ariaLabel="End time" value={endValue} onChange={onEndChange} step={step} />
      </Box>
      {helperText ? <FormHelperText error={error} sx={{ minHeight: 16, mx: 0, mt: .75 }}>{helperText}</FormHelperText> : null}
    </Box>
  );
}

export function AutocompleteInput({
  label,
  required = false,
  error = false,
  warning = false,
  helperText,
  options,
  value,
  onChange,
  multiple = false,
  freeSolo = false,
  placeholder = "Please select",
  sx,
}) {
  const generatedId = useId();
  const inputId = generatedId;
  const resolvedValue = multiple ? (Array.isArray(value) ? value : []) : (value || null);
  return (
    <Box className={`best-form-control ${warning ? "field-warning" : ""}`} sx={sx}>
      {label ? <FieldLabel required={required} htmlFor={inputId}>{label}</FieldLabel> : null}
      <Autocomplete
        multiple={multiple}
        freeSolo={freeSolo}
        options={options}
        value={resolvedValue}
        onChange={(_, nextValue) => onChange?.(nextValue)}
        onInputChange={(_, nextInputValue, reason) => {
          if (!multiple && freeSolo && reason === "input") onChange?.(nextInputValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            id={inputId}
            required={required}
            error={error}
            placeholder={resolvedValue && !multiple ? "" : placeholder}
            sx={{
              "& .MuiOutlinedInput-root": {
                ...fieldOutlineSx,
                minHeight: 40,
                py: multiple ? .5 : 0,
                ...(warning && !error ? warningOutlineSx : {}),
              },
              "& .MuiOutlinedInput-input": { minHeight: 20, py: "10px" },
            }}
          />
        )}
      />
      {helperText ? <FormHelperText error={error} sx={{ minHeight: 16, mx: 0, mt: .75, color: warning ? "warning.dark" : undefined }}>{helperText}</FormHelperText> : null}
    </Box>
  );
}

export function SelectInput({ label, required = false, error = false, warning = false, helperText, options, placeholder = "Please select", value, sx, ...props }) {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const selectedLabel = options.find((option) => option.value === value)?.label;
  return (
    <Box className={`best-form-control ${warning ? "field-warning" : ""}`} sx={sx}>
      {label ? <FieldLabel required={required} htmlFor={inputId}>{label}</FieldLabel> : null}
      <Select
        {...props}
        id={inputId}
        value={value}
        error={error}
        fullWidth
        displayEmpty
        input={<OutlinedInput />}
        renderValue={() => selectedLabel || <Box component="span" sx={{ color: "text.disabled" }}>{placeholder}</Box>}
        sx={{ ...fieldOutlineSx, ...(warning && !error ? warningOutlineSx : {}), height: 40, fontSize: 14, "& .MuiSelect-select": { display: "flex", alignItems: "center", boxSizing: "border-box", height: 40, py: 0, px: 1.5 } }}
      >
        <MenuItem value="" disabled>{placeholder}</MenuItem>
        {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </Select>
      {helperText ? <FormHelperText error={error} sx={{ minHeight: 16, mx: 0, mt: .75, color: warning ? "warning.dark" : undefined }}>{helperText}</FormHelperText> : null}
    </Box>
  );
}
