const formatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export const formatDate = (dateLike) =>
  new Intl.DateTimeFormat("pt-BR", formatOptions).format(new Date(dateLike));

export const formatDateTime = (dateLike) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateLike));

export const getLocalDateStamp = (date = new Date()) => {
  const current = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(current.getTime())) {
    return "";
  }
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getNextLocalMidnightTimestamp = (date = new Date()) => {
  const nextMidnight = new Date(date);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime();
};

export const getNextLocalFiveAmTimestamp = (date = new Date()) => {
  const current = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(current.getTime())) {
    return Date.now();
  }

  const trigger = new Date(current);
  trigger.setHours(5, 0, 0, 0);
  if (current.getTime() >= trigger.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }
  return trigger.getTime();
};

export const addDays = (dateLike, days) => {
  const date = new Date(dateLike);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const daysFromNow = (dateLike) => {
  const diff = new Date(dateLike).getTime() - Date.now();
  return Math.round(diff / 86400000);
};

export const horizonLabel = (days) => {
  if (days <= 7) return "7 dias";
  if (days <= 30) return "30 dias";
  if (days <= 90) return "3 meses";
  if (days <= 180) return "6 meses";
  if (days <= 365) return "1 ano";
  return "5 anos";
};

export const horizonOptions = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "3 meses" },
  { value: 180, label: "6 meses" },
  { value: 365, label: "1 ano" },
  { value: 1825, label: "5 anos" },
];

export const horizonLabelFromValue = (value) =>
  horizonOptions.find((item) => item.value === Number(value))?.label || horizonLabel(Number(value));

export const horizonValueToIndex = (value) =>
  Math.max(0, horizonOptions.findIndex((item) => item.value === Number(value)));

export const horizonIndexToValue = (index) =>
  horizonOptions[Math.min(horizonOptions.length - 1, Math.max(0, Number(index)))]?.value || 7;
