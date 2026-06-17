import { average, clamp } from "../utils/calculations.js";
import { horizonLabel, horizonValueToIndex } from "../utils/dates.js";
import { getActiveLeaves, getLeafDisplayName } from "../services/variableService.js";

const HORIZON_COLORS = [
  "#1e3a8a",
  "#2563eb",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#f97316",
];

const ORG_LAYOUT = {
  width: 1760,
  topPadding: 108,
  root: { x: 60, width: 170, height: 76 },
  cardinal: { x: 360, width: 220, height: 70 },
  node: { x: 700, width: 230, height: 60 },
  leaf: { x: 1040, width: 520, height: 74 },
  rowStep: 90,
  nodeGap: 26,
  cardinalGap: 48,
};

const ORGANOGRAM_INLINE_STYLES = `
  .organogram-title,
  .organogram-root__name,
  .organogram-cardinal__name,
  .organogram-node__name,
  .organogram-leaf__name {
    fill: #f8fafc;
    font-family: "Segoe UI Variable", "Aptos", "Trebuchet MS", sans-serif;
    font-weight: 700;
  }

  .organogram-title {
    font-size: 1.2rem;
    letter-spacing: 0.01em;
  }

  .organogram-subtitle,
  .organogram-root__label,
  .organogram-cardinal__meta,
  .organogram-node__meta,
  .organogram-leaf__meta,
  .organogram-leaf__pct {
    fill: rgba(226, 232, 240, 0.76);
    font-size: 12px;
    font-weight: 600;
  }

  .organogram-root__box {
    fill: rgba(245, 158, 11, 0.1);
    stroke: rgba(245, 158, 11, 0.42);
    stroke-width: 1.5;
  }

  .organogram-cardinal__box,
  .organogram-node__box,
  .organogram-leaf__box {
    fill: rgba(255, 255, 255, 0.045);
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1.2;
  }

  .organogram-cardinal__stripe {
    opacity: 0.92;
  }

  .organogram-link {
    fill: none;
    stroke: rgba(148, 163, 184, 0.22);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .organogram-leaf__pct {
    fill: #f8fafc;
    font-size: 13px;
  }
`;

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatDateTimeShort = (dateLike) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const wrapLabel = (label, maxLength = 20, maxLines = 2) => {
  const words = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  return clipped;
};

const horizonColor = (horizonDays) => {
  const index = clamp(horizonValueToIndex(horizonDays), 0, HORIZON_COLORS.length - 1);
  return HORIZON_COLORS[index];
};

const toCompletionPercent = (value) => Math.round(clamp(Number(value) || 0, 0, 100));

const toFillPercent = (value) => clamp(((Number(value) || 0) / 99) * 100, 0, 100);

const colorWithAlpha = (color, alpha) => {
  const value = String(color || "").trim();
  if (!value) return `rgba(148, 163, 184, ${alpha})`;
  if (value.startsWith("rgba(")) return value;
  if (value.startsWith("rgb(")) return value.replace(/^rgb\((.*)\)$/, `rgba($1, ${alpha})`);
  if (!value.startsWith("#")) return value;

  const hex = value.slice(1);
  const normalized = hex.length === 3
    ? hex.split("").map((part) => part + part).join("")
    : hex;
  if (normalized.length !== 6) return value;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return value;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildBranchTree = (state) => {
  const activeLeaves = getActiveLeaves(state.baseVariables || []);
  const cardinalMap = new Map();

  (state.cardinals || []).forEach((cardinal) => {
    cardinalMap.set(cardinal.id, {
      ...cardinal,
      nodes: [],
      leafCount: 0,
    });
  });

  activeLeaves.forEach((leaf) => {
    const cardinal = cardinalMap.get(leaf.cardinalId);
    if (!cardinal) return;

    let node = cardinal.nodes.find((item) => item.nodeId === leaf.nodeId);
    if (!node) {
      node = {
        nodeId: leaf.nodeId || leaf.nodeName || "sem-grupo",
        nodeName: leaf.nodeName || "Sem grupo",
        leaves: [],
      };
      cardinal.nodes.push(node);
    }

    node.leaves.push({
      ...leaf,
      displayName: getLeafDisplayName(leaf),
      completionValue: Number(leaf.currentValue) || 0,
      completionPercent: toCompletionPercent(leaf.currentValue),
      horizonColor: horizonColor(leaf.horizonDays),
      horizonLabel: horizonLabel(leaf.horizonDays),
      fillPercent: toFillPercent(leaf.currentValue),
      hidden: Boolean(leaf.hidden),
    });
    cardinal.leafCount += 1;
  });

  const cardinals = [...cardinalMap.values()].map((cardinal) => {
    const nodes = cardinal.nodes.map((node) => {
      const completionValue = average(node.leaves.map((leaf) => leaf.completionValue));
      return {
        ...node,
        leafCount: node.leaves.length,
        completionValue,
        completionPercent: toCompletionPercent(completionValue),
        color: cardinal.color,
      };
    });

    const completionValue = average(nodes.map((node) => node.completionValue));

    return {
      ...cardinal,
      nodes,
      nodeCount: nodes.length,
      completionValue,
      completionPercent: toCompletionPercent(completionValue),
    };
  });

  return { activeLeaves, cardinals };
};

const layoutOrganogram = ({ cardinals }) => {
  let cursorY = ORG_LAYOUT.topPadding;

  const laidOutCardinals = cardinals.map((cardinal, cardinalIndex) => {
    const laidOutNodes = cardinal.nodes.map((node, nodeIndex) => {
      const laidOutLeaves = node.leaves.map((leaf) => {
        const centerY = cursorY + ORG_LAYOUT.leaf.height / 2;
        const positionedLeaf = {
          ...leaf,
          x: ORG_LAYOUT.leaf.x,
          y: centerY - ORG_LAYOUT.leaf.height / 2,
          width: ORG_LAYOUT.leaf.width,
          height: ORG_LAYOUT.leaf.height,
          centerY,
        };
        cursorY += ORG_LAYOUT.rowStep;
        return positionedLeaf;
      });

      const nodeCenterY =
        laidOutLeaves.length > 0
          ? laidOutLeaves.reduce((sum, leaf) => sum + leaf.centerY, 0) / laidOutLeaves.length
          : cursorY + ORG_LAYOUT.node.height / 2;

      const positionedNode = {
        ...node,
        x: ORG_LAYOUT.node.x,
        y: nodeCenterY - ORG_LAYOUT.node.height / 2,
        width: ORG_LAYOUT.node.width,
        height: ORG_LAYOUT.node.height,
        centerY: nodeCenterY,
        leaves: laidOutLeaves,
      };

      if (nodeIndex < cardinal.nodes.length - 1) {
        cursorY += ORG_LAYOUT.nodeGap;
      }

      return positionedNode;
    });

    const cardinalCenterY =
      laidOutNodes.length > 0
        ? laidOutNodes.reduce((sum, node) => sum + node.centerY, 0) / laidOutNodes.length
        : cursorY + ORG_LAYOUT.cardinal.height / 2;

    const positionedCardinal = {
      ...cardinal,
      x: ORG_LAYOUT.cardinal.x,
      y: cardinalCenterY - ORG_LAYOUT.cardinal.height / 2,
      width: ORG_LAYOUT.cardinal.width,
      height: ORG_LAYOUT.cardinal.height,
      centerY: cardinalCenterY,
      nodes: laidOutNodes,
    };

    if (cardinalIndex < cardinals.length - 1) {
      cursorY += ORG_LAYOUT.cardinalGap;
    }

    return positionedCardinal;
  });

  const totalHeight = Math.max(760, cursorY + ORG_LAYOUT.topPadding + 24);
  const rootCenterY = totalHeight / 2;

  return {
    ...buildBranchTreeSummary(laidOutCardinals, totalHeight, rootCenterY),
    layout: {
      width: ORG_LAYOUT.width,
      height: totalHeight,
      root: {
        x: ORG_LAYOUT.root.x,
        y: rootCenterY - ORG_LAYOUT.root.height / 2,
        width: ORG_LAYOUT.root.width,
        height: ORG_LAYOUT.root.height,
        centerY: rootCenterY,
      },
    },
  };
};

const buildBranchTreeSummary = (cardinals, totalHeight, rootCenterY) => {
  const nodeCount = cardinals.reduce((sum, cardinal) => sum + cardinal.nodeCount, 0);
  const leafCount = cardinals.reduce((sum, cardinal) => sum + cardinal.leafCount, 0);
  const rootCompletionValue = average(cardinals.map((cardinal) => cardinal.completionValue));
  return {
    generatedAt: new Date().toISOString(),
    title: "Organograma horizontal",
    subtitle: "Vida -> cardinais -> galhos -> folhas",
    root: {
      name: "Vida",
      label: "Conclusão geral",
      completionValue: rootCompletionValue,
      completionPercent: toCompletionPercent(rootCompletionValue),
    },
    metrics: {
      cardinalCount: cardinals.length,
      nodeCount,
      leafCount,
    },
    cardinals,
    totalHeight,
    rootCenterY,
  };
};

export const buildOrganogramSnapshot = (state) => {
  const tree = layoutOrganogram(buildBranchTree(state));
  return {
    id: `organogram-${Date.now()}`,
    version: 1,
    ...tree,
  };
};

const buildSvgDocument = (snapshot) => {
  if (!snapshot) return "";

  const connectors = [];
  snapshot.cardinals.forEach((cardinal) => {
    connectors.push(renderConnector(snapshot.layout.root, cardinal, 240, cardinal.color));
    cardinal.nodes.forEach((node) => {
      connectors.push(renderConnector(cardinal, node, 540, cardinal.color));
      node.leaves.forEach((leaf) => {
        connectors.push(renderConnector(node, leaf, 860, leaf.horizonColor));
      });
    });
  });

  const cardinalsMarkup = snapshot.cardinals.map((cardinal) => renderCardinal(cardinal)).join("");
  const nodesMarkup = snapshot.cardinals
    .flatMap((cardinal) => cardinal.nodes.map((node) => renderNode(node)))
    .join("");
  const leavesMarkup = snapshot.cardinals
    .flatMap((cardinal) => cardinal.nodes.flatMap((node) => node.leaves.map((leaf) => renderLeaf(leaf))))
    .join("");

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${ORG_LAYOUT.width} ${snapshot.layout.height}"
      width="${ORG_LAYOUT.width}"
      height="${snapshot.layout.height}"
      class="organogram-svg"
      role="img"
      aria-label="Organograma horizontal da vida"
    >
      <defs>
        <linearGradient id="organogram-background" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1220" />
          <stop offset="100%" stop-color="#09111f" />
        </linearGradient>
        <linearGradient id="organogram-grid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.08)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
        </linearGradient>
        <filter id="organogram-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.55" />
        </filter>
      </defs>
      <style>${ORGANOGRAM_INLINE_STYLES}</style>
      <rect width="100%" height="100%" fill="url(#organogram-background)" />
      <rect x="0" y="0" width="100%" height="100%" fill="url(#organogram-grid)" opacity="0.2" />
      <text x="52" y="44" class="organogram-title">${escapeXml(snapshot.title)}</text>
      <text x="52" y="70" class="organogram-subtitle">${escapeXml(snapshot.subtitle)}</text>
      <text x="${ORG_LAYOUT.width - 52}" y="44" text-anchor="end" class="organogram-subtitle">
        Gerado em ${escapeXml(formatDateTimeShort(snapshot.generatedAt))}
      </text>
      <text x="${ORG_LAYOUT.width - 52}" y="70" text-anchor="end" class="organogram-subtitle">
        ${snapshot.metrics.cardinalCount} cardinais • ${snapshot.metrics.nodeCount} galhos • ${snapshot.metrics.leafCount} folhas
      </text>
      <g filter="url(#organogram-glow)">
        ${connectors.join("")}
        ${renderRoot(snapshot)}
        ${cardinalsMarkup}
        ${nodesMarkup}
        ${leavesMarkup}
      </g>
    </svg>
  `;
};

const renderTextLines = (lines, x, y, options = {}) => {
  const {
    className = "",
    anchor = "middle",
    lineHeight = 18,
    startDy = 0,
  } = options;

  return `
    <text x="${x}" y="${y}" text-anchor="${anchor}" class="${className}">
      ${lines
        .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? startDy : lineHeight}">${escapeXml(line)}</tspan>`)
        .join("")}
    </text>
  `;
};

const renderConnector = (from, to, curveX, strokeColor) => {
  const startX = from.x + from.width;
  const endX = to.x;
  const midX = curveX ?? (startX + endX) / 2;
  return `<path d="M ${startX} ${from.centerY} H ${midX} V ${to.centerY} H ${endX}" class="organogram-link" stroke="${escapeXml(colorWithAlpha(strokeColor, 0.5))}" />`;
};

const renderRoot = (snapshot) => {
  const root = snapshot.layout.root;
  const box = snapshot.root;
  const nameLines = wrapLabel(box.name, 18, 2);
  return `
    <g class="organogram-root" transform="translate(${root.x}, ${root.y})">
      <rect x="0" y="0" width="${root.width}" height="${root.height}" rx="24" class="organogram-root__box" />
      ${renderTextLines(nameLines, root.width / 2, 28, {
        className: "organogram-root__name",
        lineHeight: 20,
      })}
      <text x="${root.width / 2}" y="52" text-anchor="middle" class="organogram-root__label">${escapeXml(box.completionPercent)}% concluído</text>
    </g>
  `;
};

const renderCardinal = (cardinal) => {
  const nameLines = wrapLabel(cardinal.name, 18, 2);
  return `
    <g class="organogram-cardinal" transform="translate(${cardinal.x}, ${cardinal.y})">
      <rect x="0" y="0" width="${cardinal.width}" height="${cardinal.height}" rx="18" class="organogram-cardinal__box" fill="${escapeXml(colorWithAlpha(cardinal.color, 0.14))}" stroke="${escapeXml(colorWithAlpha(cardinal.color, 0.38))}" />
      <rect x="0" y="0" width="7" height="${cardinal.height}" rx="18" class="organogram-cardinal__stripe" fill="${escapeXml(cardinal.color)}" />
      ${renderTextLines(nameLines, 18, 26, {
        className: "organogram-cardinal__name",
        anchor: "start",
        lineHeight: 18,
      })}
      <text x="${cardinal.width - 16}" y="24" text-anchor="end" class="organogram-cardinal__meta">${cardinal.completionPercent}% concluído</text>
      <text x="${cardinal.width - 16}" y="45" text-anchor="end" class="organogram-cardinal__meta organogram-cardinal__meta--subtle">${cardinal.nodeCount} galhos • ${cardinal.leafCount} folhas</text>
    </g>
  `;
};

const renderNode = (node) => {
  const nameLines = wrapLabel(node.nodeName, 18, 2);
  return `
    <g class="organogram-node" transform="translate(${node.x}, ${node.y})">
      <rect x="0" y="0" width="${node.width}" height="${node.height}" rx="16" class="organogram-node__box" fill="${escapeXml(colorWithAlpha(node.color, 0.12))}" stroke="${escapeXml(colorWithAlpha(node.color, 0.34))}" />
      ${renderTextLines(nameLines, 16, 24, {
        className: "organogram-node__name",
        anchor: "start",
        lineHeight: 17,
      })}
      <text x="${node.width - 16}" y="24" text-anchor="end" class="organogram-node__meta">${node.completionPercent}% concluído</text>
      <text x="${node.width - 16}" y="42" text-anchor="end" class="organogram-node__meta organogram-node__meta--subtle">${node.leafCount} folhas</text>
    </g>
  `;
};

const renderLeaf = (leaf) => {
  const nameLines = wrapLabel(leaf.displayName, 24, 2);
  const fillWidth = Math.max(0, Math.round((leaf.width - 12) * (leaf.fillPercent / 100)));
  const accentOpacity = leaf.hidden ? 0.46 : 0.82;
  const baseOpacity = leaf.hidden ? 0.72 : 1;
  const subtitle = `${leaf.currentValue}/99 • ${leaf.completionPercent}%`;

  return `
    <g class="organogram-leaf ${leaf.hidden ? "is-hidden" : ""}" transform="translate(${leaf.x}, ${leaf.y})" opacity="${baseOpacity}">
      <rect x="0" y="0" width="${leaf.width}" height="${leaf.height}" rx="20" class="organogram-leaf__box" />
      <rect x="0" y="0" width="${fillWidth}" height="${leaf.height}" rx="20" fill="${escapeXml(leaf.horizonColor)}" opacity="${accentOpacity}" />
      <rect x="0" y="0" width="10" height="${leaf.height}" rx="20" fill="${escapeXml(leaf.horizonColor)}" />
      ${renderTextLines(nameLines, 22, 28, {
        className: "organogram-leaf__name",
        anchor: "start",
        lineHeight: 18,
      })}
      <text x="${leaf.width - 18}" y="26" text-anchor="end" class="organogram-leaf__pct">${leaf.completionPercent}%</text>
      <text x="22" y="${leaf.height - 16}" class="organogram-leaf__meta">${escapeXml(subtitle)}</text>
      <text x="${leaf.width - 18}" y="${leaf.height - 16}" text-anchor="end" class="organogram-leaf__meta">${escapeXml(leaf.horizonLabel)}</text>
    </g>
  `;
};

export const renderOrganogramSvg = (snapshot) => {
  return buildSvgDocument(snapshot);
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const snapshotFileBase = (snapshot) => `organograma-${snapshot.generatedAt.slice(0, 10)}`;

export const createOrganogramSvgBlob = (snapshot) =>
  new Blob([buildSvgDocument(snapshot)], { type: "image/svg+xml;charset=utf-8" });

export const createOrganogramPngBlob = async (snapshot) => {
  const svg = buildSvgDocument(snapshot);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = svgUrl;
    });

    const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(snapshot.layout.width * scale);
    canvas.height = Math.round(snapshot.layout.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas indisponível para exportação.");
    }

    context.scale(scale, scale);
    context.drawImage(image, 0, 0, snapshot.layout.width, snapshot.layout.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Falha ao exportar a imagem."));
      }, "image/png");
    });

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

export const downloadOrganogramSnapshot = async (snapshot) => {
  try {
    const blob = await createOrganogramPngBlob(snapshot);
    downloadBlob(blob, `${snapshotFileBase(snapshot)}.png`);
  } catch {
    const blob = createOrganogramSvgBlob(snapshot);
    downloadBlob(blob, `${snapshotFileBase(snapshot)}.svg`);
  }
};

export const shareOrganogramSnapshot = async (snapshot) => {
  const fileName = `${snapshotFileBase(snapshot)}.png`;
  let blob;
  let mimeType = "image/png";

  try {
    blob = await createOrganogramPngBlob(snapshot);
  } catch {
    blob = createOrganogramSvgBlob(snapshot);
    mimeType = "image/svg+xml";
  }

  const file = new File([blob], mimeType === "image/png" ? fileName : `${snapshotFileBase(snapshot)}.svg`, {
    type: mimeType,
  });

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      title: "Organograma horizontal",
      text: "Organograma da sessão atual",
      files: [file],
    });
    return true;
  }

  downloadBlob(blob, file.name);
  return false;
};
