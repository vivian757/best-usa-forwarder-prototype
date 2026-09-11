import { useEffect, useId, useState } from "react";
import { Autocomplete, Box, ButtonBase, FormControl, FormControlLabel, FormHelperText, IconButton, InputAdornment, MenuItem, OutlinedInput, Popover, Radio, RadioGroup, Select, TextField, Tooltip, Typography } from "@mui/material";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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

const englishMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const englishMonthFullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const englishWeekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatEnglishDate(value = "") {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return `${englishMonthNames[monthIndex]} ${Number(match[3])}, ${match[1]}`;
}

function parseEnglishDate(value = "") {
  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const numericMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const monthMatch = normalized.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  let year;
  let month;
  let day;
  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else if (numericMatch) {
    [, month, day, year] = numericMatch;
  } else if (monthMatch) {
    const monthIndex = englishMonthNames.findIndex((name) => monthMatch[1].toLowerCase().startsWith(name.toLowerCase()));
    if (monthIndex < 0) return null;
    year = monthMatch[3];
    month = String(monthIndex + 1);
    day = monthMatch[2];
  } else {
    return null;
  }
  const isoValue = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const candidate = new Date(`${isoValue}T00:00:00Z`);
  if (Number.isNaN(candidate.getTime()) || candidate.toISOString().slice(0, 10) !== isoValue) return null;
  return isoValue;
}

export function EnglishDateInput({ label, value = "", onChange, required = false, error = false, helperText, min, max, ariaLabel, sx }) {
  const generatedId = useId();
  const inputId = generatedId;
  const [pickerAnchorEl, setPickerAnchorEl] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => String(value || min || new Date().toISOString().slice(0, 10)).slice(0, 7));
  const [draftValue, setDraftValue] = useState(() => formatEnglishDate(value));

  useEffect(() => {
    setDraftValue(formatEnglishDate(value));
  }, [value]);

  const commitValue = () => {
    if (!draftValue.trim()) {
      if (value) onChange?.({ target: { value: "" } });
      return;
    }
    const parsedValue = parseEnglishDate(draftValue);
    if (!parsedValue || (min && parsedValue < min) || (max && parsedValue > max)) {
      setDraftValue(formatEnglishDate(value));
      return;
    }
    setDraftValue(formatEnglishDate(parsedValue));
    if (parsedValue !== value) onChange?.({ target: { value: parsedValue } });
  };

  const openPicker = (event) => {
    setCalendarMonth(String(value || min || new Date().toISOString().slice(0, 10)).slice(0, 7));
    setPickerAnchorEl(event.currentTarget);
  };
  const [calendarYear, calendarMonthNumber] = calendarMonth.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonthNumber, 0)).getUTCDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `blank-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateValue = `${calendarMonth}-${String(day).padStart(2, "0")}`;
      return { key: dateValue, day, dateValue };
    }),
  ];
  const changeCalendarMonth = (amount) => {
    const nextMonth = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1 + amount, 1));
    setCalendarMonth(`${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <Box className="best-form-control english-date-input" sx={{ position: "relative", ...sx }}>
      {label ? <FieldLabel required={required} htmlFor={inputId}>{label}</FieldLabel> : null}
      <OutlinedInput
        id={inputId}
        fullWidth
        type="text"
        inputMode="text"
        autoComplete="off"
        required={required}
        error={error}
        placeholder="MMM D, YYYY"
        value={draftValue}
        endAdornment={(
          <InputAdornment position="end">
            <Tooltip title="Choose date">
              <IconButton aria-label={ariaLabel ? `Choose ${ariaLabel.toLowerCase()}` : "Choose date"} aria-haspopup="dialog" aria-expanded={Boolean(pickerAnchorEl)} edge="end" size="small" onClick={openPicker}>
                <CalendarDays size={18} />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        )}
        slotProps={{ input: { "aria-label": ariaLabel, spellCheck: false } }}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.target.blur();
          if (event.key === "Escape") {
            setDraftValue(formatEnglishDate(value));
            event.target.blur();
          }
        }}
        sx={{
          ...fieldOutlineSx,
          minHeight: 40,
          "& .MuiOutlinedInput-input": { boxSizing: "border-box", height: 40, p: "10px 12px", fontSize: 14, lineHeight: "20px" },
        }}
      />
      <Popover
        open={Boolean(pickerAnchorEl)}
        anchorEl={pickerAnchorEl}
        onClose={() => setPickerAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { role: "dialog", "aria-label": ariaLabel ? `Choose ${ariaLabel.toLowerCase()}` : "Choose date", sx: { mt: .75, p: 1.5, width: 288, borderRadius: 2, boxShadow: "0 8px 24px rgba(23, 36, 46, .14)" } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{englishMonthFullNames[calendarMonthNumber - 1]} {calendarYear}</Typography>
          <Box sx={{ display: "flex", gap: .5 }}>
            <IconButton aria-label="Previous month" size="small" onClick={() => changeCalendarMonth(-1)}><ChevronLeft size={17} /></IconButton>
            <IconButton aria-label="Next month" size="small" onClick={() => changeCalendarMonth(1)}><ChevronRight size={17} /></IconButton>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: .25 }}>
          {englishWeekdayNames.map((weekday) => <Typography key={weekday} component="span" sx={{ py: .5, textAlign: "center", color: "text.secondary", fontSize: 11, fontWeight: 600 }}>{weekday}</Typography>)}
          {calendarCells.map((cell) => cell.dateValue ? (
            <ButtonBase
              key={cell.key}
              aria-label={`${englishMonthFullNames[calendarMonthNumber - 1]} ${cell.day}, ${calendarYear}`}
              disabled={Boolean((min && cell.dateValue < min) || (max && cell.dateValue > max))}
              onClick={() => {
                onChange?.({ target: { value: cell.dateValue } });
                setPickerAnchorEl(null);
              }}
              sx={{ width: 36, height: 36, justifySelf: "center", borderRadius: "50%", fontSize: 13, fontVariantNumeric: "tabular-nums", color: cell.dateValue === value ? "primary.contrastText" : "text.primary", backgroundColor: cell.dateValue === value ? "primary.main" : "transparent", "&:hover": { backgroundColor: cell.dateValue === value ? "primary.dark" : "primary.100" }, "&.Mui-disabled": { color: "text.disabled" } }}
            >
              {cell.day}
            </ButtonBase>
          ) : <Box key={cell.key} aria-hidden="true" />)}
        </Box>
      </Popover>
      {helperText ? <FormHelperText error={error} sx={{ minHeight: 16, mx: 0, mt: .75 }}>{helperText}</FormHelperText> : null}
    </Box>
  );
}

function EnglishTimeInput({ label, value, onChange, ariaLabel, error = false }) {
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
      error={error}
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

export function EnglishDateTimeInput({ label, value = "", onChange, required = false, error = false, helperText, ariaLabel, sx }) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const dateValue = String(value).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
  const timeValue = String(value).match(/T(\d{2}:\d{2})/)?.[1] || "";
  const updatePart = ({ date = dateValue, time = timeValue }) => {
    if (!date && !time) onChange?.("");
    else if (!date) onChange?.(`T${time}`);
    else if (!time) onChange?.(`${date}T`);
    else onChange?.(`${date}T${time}`);
  };
  return (
    <Box className="best-form-control english-date-time-input" sx={sx}>
      {label ? <FieldLabel id={labelId} required={required}>{label}</FieldLabel> : null}
      <Box role="group" aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel || "Date and time"} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(112px, .8fr)", gap: 1 }}>
        <EnglishDateInput value={dateValue} onChange={(event) => updatePart({ date: event.target.value })} ariaLabel={`${ariaLabel || label || "Date and time"} date`} />
        <EnglishTimeInput label="Time" value={timeValue} onChange={(event) => updatePart({ time: event.target.value })} ariaLabel={`${ariaLabel || label || "Date and time"} time`} error={error} />
      </Box>
      {helperText ? <FormHelperText error={error} sx={{ minHeight: 16, mx: 0, mt: .75 }}>{helperText}</FormHelperText> : null}
    </Box>
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
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps?.htmlInput,
                id: inputId,
                "aria-label": label || params.slotProps?.htmlInput?.["aria-label"],
              },
            }}
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
        aria-label={label || props["aria-label"]}
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
