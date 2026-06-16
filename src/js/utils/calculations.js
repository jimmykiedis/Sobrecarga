export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const roundOne = (value) => Math.round(value * 10) / 10;

export const formatPercent = (value) => `${Math.round(value)}%`;

export const valueToPercent = (value, min = 49, max = 99) =>
  ((clamp(value, min, max) - min) / (max - min)) * 100;

export const percentToValue = (percent, min = 49, max = 99) =>
  Math.round((clamp(percent, 0, 100) / 100) * (max - min) + min);

export const nextDeltaValue = (value, delta) => clamp(value + delta, 49, 99);

export const progressBetween = (startValue, currentValue, targetValue) => {
  const range = Math.max(1, Math.abs(targetValue - startValue));
  return clamp(((currentValue - startValue) / range) * 100, 0, 100);
};

export const progressDirection = (startValue, currentValue) =>
  currentValue >= startValue ? "up" : "down";

export const getProgressTone = (value) => {
  if (value >= 90) return "excellent";
  if (value >= 80) return "healthy";
  if (value >= 70) return "steady";
  if (value >= 60) return "attention";
  return "critical";
};

export const toSafeId = (value) =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
