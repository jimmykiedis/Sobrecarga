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
  if (days <= 30) return "Curto prazo";
  if (days <= 90) return "Médio prazo";
  if (days <= 365) return "Longo prazo";
  return "Muito longo prazo";
};
