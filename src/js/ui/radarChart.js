import { clamp, valueToPercent } from "../utils/calculations.js";

const polarToCartesian = (centerX, centerY, radius, angleDeg) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
};

export const renderRadarChart = (items, size = 360) => {
  const center = size / 2;
  const outerRadius = size * 0.34;
  const steps = 4;
  const axisCount = items.length;

  const gridRings = Array.from({ length: steps }, (_, ringIndex) => {
    const ringRadius = (outerRadius / steps) * (ringIndex + 1);
    const points = items
      .map((_, index) => {
        const angle = (360 / axisCount) * index;
        const point = polarToCartesian(center, center, ringRadius, angle);
        return `${point.x},${point.y}`;
      })
      .join(" ");
    return `<polygon points="${points}" class="radar-grid-ring" />`;
  }).join("");

  const axes = items
    .map((item, index) => {
      const angle = (360 / axisCount) * index;
      const point = polarToCartesian(center, center, outerRadius, angle);
      const labelPoint = polarToCartesian(center, center, outerRadius + 28, angle);
      const valueRadius = (clamp(item.value, 49, 99) - 49) / 50 * outerRadius;
      const valuePoint = polarToCartesian(center, center, valueRadius, angle);
      const textAnchor = labelPoint.x > center + 10 ? "start" : labelPoint.x < center - 10 ? "end" : "middle";
      return `
        <g class="radar-axis">
          <line x1="${center}" y1="${center}" x2="${point.x}" y2="${point.y}" class="radar-axis-line" />
          <circle cx="${valuePoint.x}" cy="${valuePoint.y}" r="5" class="radar-axis-dot" />
          <text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="${textAnchor}" class="radar-label">${item.name}</text>
        </g>
      `;
    })
    .join("");

  const valuePoints = items
    .map((item, index) => {
      const angle = (360 / axisCount) * index;
      const radius = ((clamp(item.value, 49, 99) - 49) / 50) * outerRadius;
      const point = polarToCartesian(center, center, radius, angle);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const averageRadius = outerRadius * 0.6;
  const averagePoint = polarToCartesian(center, center, averageRadius, 0);

  return `
    <svg viewBox="0 0 ${size} ${size}" class="radar-chart" role="img" aria-label="Gráfico de radar das variáveis cardinais">
      <defs>
        <linearGradient id="radar-fill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(245, 158, 11, 0.55)" />
          <stop offset="100%" stop-color="rgba(16, 185, 129, 0.35)" />
        </linearGradient>
      </defs>
      <circle cx="${center}" cy="${center}" r="${averageRadius}" class="radar-center-ring" />
      ${gridRings}
      ${axes}
      <polygon points="${valuePoints}" class="radar-polygon" />
      <circle cx="${averagePoint.x}" cy="${averagePoint.y}" r="3" class="radar-center-dot" />
    </svg>
  `;
};
