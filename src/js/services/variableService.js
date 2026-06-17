import { BaseVariable } from "../models/BaseVariable.js";
import { CardinalVariable } from "../models/CardinalVariable.js";
import { addDays, getLocalDateStamp } from "../utils/dates.js";
import { average, clamp } from "../utils/calculations.js";

const now = new Date();
const getDueDateStamp = (dateLike, days) => getLocalDateStamp(addDays(dateLike, days));
const todayStamp = getLocalDateStamp(now);
export const CURRENT_SCHEMA_VERSION = 5;

const cardinalDefinitions = [
  { id: "identidade", name: "Identidade", color: "#f59e0b", icon: "◌" },
  { id: "mental", name: "Saúde Mental", color: "#8b5cf6", icon: "◐" },
  { id: "fisica", name: "Saúde Física", color: "#10b981", icon: "◍" },
  { id: "familia", name: "Família", color: "#ef4444", icon: "◑" },
  { id: "profissional", name: "Profissional", color: "#0ea5e9", icon: "◓" },
];

export const getLeafDisplayName = (leaf) => leaf?.customName?.trim() || leaf?.name || "";

const normalizeLeafCustomName = (value) => {
  const normalized = String(value || "").trim();
  return normalized || undefined;
};

const normalizeLeafBoolean = (value) => Boolean(value);
const isDateStamp = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const buildNextStepSelection = (leaf, selectedAt = new Date().toISOString(), overrides = {}) => {
  const selectedDate = new Date(selectedAt);
  const safeSelectedAt = Number.isNaN(selectedDate.getTime()) ? new Date().toISOString() : selectedDate.toISOString();
  const effectiveHorizonDays = Number(overrides.horizonDays ?? leaf?.horizonDays ?? 7);
  const dueDateStamp = isDateStamp(overrides.dueDateStamp)
    ? overrides.dueDateStamp
    : getDueDateStamp(safeSelectedAt, effectiveHorizonDays);

  return {
    leafId: leaf?.id || "",
    text: getLeafDisplayName(leaf) || "Definir",
    selectedAt: safeSelectedAt,
    dueDateStamp,
    horizonDays: effectiveHorizonDays,
    reminderShownForDateStamp: overrides.reminderShownForDateStamp || "",
  };
};

const isDeletedLeaf = (leaf) => Boolean(leaf?.deleted);

const isIncludedInCalculations = (leaf) => !isDeletedLeaf(leaf);

export const getActiveLeaves = (baseVariables = []) => baseVariables.filter(isIncludedInCalculations);

const createLeafId = (cardinalId, nodeId, name) => {
  const slug = String(name || "nova-folha")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `${Date.now()}`;
  return `${cardinalId}-${nodeId}-${slug || "folha"}-${randomPart}`;
};

const createLeaf = ({
  id,
  cardinalId,
  nodeId,
  nodeName,
  name,
  currentValue,
  targetValue,
  startValue,
  previousValue,
  snapshotDate,
  horizonDays,
  note,
  brothers = [],
  archived = false,
  hidden = false,
  deleted = false,
  createdAtOffsetDays = -30,
}) =>
  new BaseVariable({
    id,
    cardinalId,
    nodeId,
    nodeName,
    name,
    currentValue,
    targetValue,
    startValue,
    previousValue: previousValue ?? currentValue,
    snapshotDate: snapshotDate ?? todayStamp,
    createdAt: addDays(now, createdAtOffsetDays),
    horizonDays,
    note,
    brothers,
    archived,
    hidden,
    deleted,
  });

const createLeaves = ({
  cardinalId,
  nodeId,
  nodeName,
  horizonDays,
  startOffset = 6,
  targetValue = 85,
  currentValue = 74,
  items,
}) =>
  items.map((item, index) => {
    const spec = typeof item === "string" ? { name: item } : item;
    const value = spec.currentValue ?? Math.max(49, Math.min(99, currentValue - index));
    const target = spec.targetValue ?? targetValue;
    const start = spec.startValue ?? Math.max(49, Math.min(99, value - (spec.startOffset ?? startOffset)));
    return createLeaf({
      id: spec.id || `${cardinalId}-${nodeId}-${index}`,
      cardinalId,
      nodeId,
      nodeName,
      name: spec.name,
      currentValue: value,
      targetValue: target,
      startValue: start,
      previousValue: spec.previousValue ?? value,
      snapshotDate: spec.snapshotDate ?? todayStamp,
      horizonDays: spec.horizonDays ?? horizonDays,
      note: spec.note || `${spec.name} dentro de ${nodeName}.`,
      brothers: spec.brothers || [],
      archived: spec.archived || false,
      hidden: spec.hidden || false,
      deleted: spec.deleted || false,
      createdAtOffsetDays: spec.createdAtOffsetDays ?? -30 - index * 7,
    });
  });

const leafSeed = [
  ...createLeaves({
    cardinalId: "identidade",
    nodeId: "homem",
    nodeName: "Homem",
    horizonDays: 365,
    currentValue: 82,
    targetValue: 90,
    items: [
      "Desenvolvimento Pessoal",
      "Valores",
      "Princípios",
      "Propósito",
    ],
  }),
  ...createLeaves({
    cardinalId: "identidade",
    nodeId: "amigo",
    nodeName: "Amigo",
    horizonDays: 365,
    currentValue: 76,
    targetValue: 84,
    items: [
      { name: "Rede de Apoio", brothers: ["Socialização"] },
      { name: "Socialização", brothers: ["Rede de Apoio"] },
    ],
  }),
  ...createLeaves({
    cardinalId: "identidade",
    nodeId: "objetivos",
    nodeName: "Objetivos",
    horizonDays: 365,
    currentValue: 70,
    targetValue: 86,
    items: [
      { id: "identidade-90-dias", name: "Clareza de Valores", horizonDays: 90, targetValue: 78 },
      { id: "identidade-1-ano", name: "Direção de Vida", horizonDays: 365, targetValue: 82 },
      { id: "identidade-5-anos", name: "Legado Pessoal", horizonDays: 1825, targetValue: 88 },
    ],
  }),
  ...createLeaves({
    cardinalId: "identidade",
    nodeId: "preocupacoes",
    nodeName: "Preocupações",
    horizonDays: 90,
    currentValue: 64,
    targetValue: 76,
    items: [
      "Crise de Identidade",
      "Solidão",
      "Futuro",
    ],
  }),
  ...createLeaves({
    cardinalId: "mental",
    nodeId: "estado-emocional",
    nodeName: "Estado Emocional",
    horizonDays: 30,
    currentValue: 72,
    targetValue: 83,
    items: [
      "Humor",
      "Estresse",
      "Ansiedade",
    ],
  }),
  ...createLeaves({
    cardinalId: "mental",
    nodeId: "bem-estar-psicologico",
    nodeName: "Bem-estar Psicológico",
    horizonDays: 90,
    currentValue: 78,
    targetValue: 88,
    items: [
      "Autoconhecimento",
      "Terapia",
      "Equilíbrio Emocional",
    ],
  }),
  ...createLeaves({
    cardinalId: "mental",
    nodeId: "objetivos",
    nodeName: "Objetivos",
    horizonDays: 90,
    currentValue: 70,
    targetValue: 84,
    items: [
      { id: "mental-reduzir-estresse", name: "Reduzir Estresse", horizonDays: 90 },
      { id: "mental-melhorar-equilibrio", name: "Melhorar Equilíbrio Emocional", horizonDays: 90 },
    ],
  }),
  ...createLeaves({
    cardinalId: "mental",
    nodeId: "preocupacoes",
    nodeName: "Preocupações",
    horizonDays: 90,
    currentValue: 62,
    targetValue: 74,
    items: [
      "Sobrecarga Mental",
      "Burnout",
      "Ansiedade",
    ],
  }),
  ...createLeaves({
    cardinalId: "fisica",
    nodeId: "corpo",
    nodeName: "Corpo",
    horizonDays: 30,
    currentValue: 68,
    targetValue: 82,
    items: [
      "Sono",
      "Energia",
      "Exercícios",
      "Alimentação",
    ],
  }),
  ...createLeaves({
    cardinalId: "fisica",
    nodeId: "indicadores",
    nodeName: "Indicadores",
    horizonDays: 90,
    currentValue: 66,
    targetValue: 80,
    items: [
      "Peso",
      "Condicionamento",
      "Exames",
    ],
  }),
  ...createLeaves({
    cardinalId: "fisica",
    nodeId: "objetivos",
    nodeName: "Objetivos",
    horizonDays: 90,
    currentValue: 69,
    targetValue: 84,
    items: [
      { id: "fisica-dormir-7h", name: "Dormir 7h", horizonDays: 90 },
      { id: "fisica-voltar-treinar", name: "Voltar a Treinar", horizonDays: 90 },
      { id: "fisica-melhorar-energia", name: "Melhorar Energia", horizonDays: 90 },
    ],
  }),
  ...createLeaves({
    cardinalId: "fisica",
    nodeId: "preocupacoes",
    nodeName: "Preocupações",
    horizonDays: 90,
    currentValue: 61,
    targetValue: 75,
    items: [
      "Sedentarismo",
      "Exaustão",
      "Doenças",
    ],
  }),
  ...createLeaves({
    cardinalId: "familia",
    nodeId: "pai",
    nodeName: "Pai",
    horizonDays: 90,
    currentValue: 74,
    targetValue: 86,
    items: [
      "Tempo de Qualidade",
      "Educação",
      "Rotina",
      "Finanças do Filho",
    ],
  }),
  ...createLeaves({
    cardinalId: "familia",
    nodeId: "ex-companheiro",
    nodeName: "Ex-Companheiro",
    horizonDays: 90,
    currentValue: 68,
    targetValue: 80,
    items: [
      "Comunicação",
      "Guarda Compartilhada",
      "Bem-estar da Mãe da Criança",
    ],
  }),
  ...createLeaves({
    cardinalId: "familia",
    nodeId: "gestao-familiar",
    nodeName: "Gestão Familiar",
    horizonDays: 90,
    currentValue: 72,
    targetValue: 84,
    items: [
      "Agenda",
      "Compromissos",
      "Gastos",
      "Saúde",
      "Desenvolvimento",
    ],
  }),
  ...createLeaves({
    cardinalId: "familia",
    nodeId: "objetivos",
    nodeName: "Objetivos",
    horizonDays: 90,
    currentValue: 69,
    targetValue: 83,
    items: [
      { id: "familia-rotina-estavel-filho", name: "Rotina Estável do Filho", horizonDays: 90 },
      { id: "familia-separacao-saudavel", name: "Separação Saudável", horizonDays: 90 },
      { id: "familia-melhor-comunicacao", name: "Melhor Comunicação", horizonDays: 90 },
    ],
  }),
  ...createLeaves({
    cardinalId: "familia",
    nodeId: "preocupacoes",
    nodeName: "Preocupações",
    horizonDays: 90,
    currentValue: 60,
    targetValue: 74,
    items: [
      "Educação do Filho",
      "Conflitos Familiares",
      "Falta de Tempo",
    ],
  }),
  ...createLeaves({
    cardinalId: "profissional",
    nodeId: "empresario",
    nodeName: "Empresário",
    horizonDays: 90,
    currentValue: 76,
    targetValue: 88,
    items: [
      "Operação",
      "Crescimento",
      "Equipe",
      "Finanças",
    ],
  }),
  ...createLeaves({
    cardinalId: "profissional",
    nodeId: "indicadores",
    nodeName: "Indicadores",
    horizonDays: 90,
    currentValue: 72,
    targetValue: 85,
    items: [
      "Receita",
      "Lucro",
      "Funcionários",
      "Projetos",
      "Problemas Críticos",
    ],
  }),
  ...createLeaves({
    cardinalId: "profissional",
    nodeId: "objetivos",
    nodeName: "Objetivos",
    horizonDays: 90,
    currentValue: 70,
    targetValue: 84,
    items: [
      { id: "profissional-delegar-operacao", name: "Delegar Operação", horizonDays: 90 },
      { id: "profissional-crescimento-empresa", name: "Crescimento da Empresa", horizonDays: 365 },
      { id: "profissional-liberdade-financeira", name: "Liberdade Financeira", horizonDays: 1825 },
    ],
  }),
  ...createLeaves({
    cardinalId: "profissional",
    nodeId: "preocupacoes",
    nodeName: "Preocupações",
    horizonDays: 90,
    currentValue: 63,
    targetValue: 76,
    items: [
      "Fluxo de Caixa",
      "Sobrecarga de Trabalho",
      "Riscos do Negócio",
    ],
  }),
];

function calculateCardinalAverage(cardinalId, leaves) {
  const values = getActiveLeaves(leaves)
    .filter((leaf) => leaf.cardinalId === cardinalId)
    .map((leaf) => leaf.currentValue);
  if (!values.length) return 49;
  return Math.round(average(values));
}

function buildCardinalsFromLeaves(leaves) {
  return cardinalDefinitions.map((cardinal) =>
    new CardinalVariable({
      ...cardinal,
      value: calculateCardinalAverage(cardinal.id, leaves),
    })
  );
}

function adjustCardinalLeaves(leaves, cardinalId, delta) {
  const relatedIndexes = leaves
    .map((leaf, index) => (leaf.cardinalId === cardinalId ? index : -1))
    .filter((index) => index !== -1 && isIncludedInCalculations(leaves[index]));

  if (!relatedIndexes.length || delta === 0) return leaves;

  const nextLeaves = leaves.map((leaf) => ({ ...leaf }));
  let remaining = delta * relatedIndexes.length;
  const direction = remaining > 0 ? 1 : -1;

  while (remaining !== 0) {
    let changedInPass = false;

    for (const index of relatedIndexes) {
      if (remaining === 0) break;

      const leaf = nextLeaves[index];
      const candidate = clamp(leaf.currentValue + direction, 49, 99);
      if (candidate === leaf.currentValue) {
        continue;
      }

      leaf.currentValue = candidate;
      remaining -= direction;
      changedInPass = true;
    }

    if (!changedInPass) {
      break;
    }
  }

  return nextLeaves;
}

export const createDefaultState = () => {
  const cardinals = buildCardinalsFromLeaves(leafSeed);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cardinals,
    baseVariables: leafSeed.map((item) => ({
      ...item,
      defaultName: item.name,
      hidden: Boolean(item.hidden),
      deleted: Boolean(item.deleted),
    })),
    weeklyReview: {
      moodValue: 0,
      moodLabel: "Neutro",
      progressionScore: 0,
      note: "",
    },
    nextStep: buildNextStepSelection(leafSeed[0], now.toISOString()),
    showArchive: false,
    showHiddenLeaves: false,
    leafSearchQuery: "",
    modalOpen: false,
    organogram: {
      latest: null,
      history: [],
    },
    updatedAt: new Date().toISOString(),
  };
};

export const normalizeState = (state) => ({
  ...state,
  cardinals: (state.cardinals || []).map((cardinal) => ({
    ...cardinal,
    value: clamp(cardinal.value, 49, 99),
  })),
  baseVariables: (state.baseVariables || []).map((leaf) => ({
    ...leaf,
    defaultName: leaf.defaultName || leaf.name || "",
    customName: normalizeLeafCustomName(leaf.customName),
    hidden: normalizeLeafBoolean(leaf.hidden),
    deleted: normalizeLeafBoolean(leaf.deleted),
    name:
      normalizeLeafCustomName(leaf.customName) ||
      leaf.name ||
      leaf.defaultName ||
      "",
    startValue: clamp(leaf.startValue, 49, 99),
    targetValue: clamp(leaf.targetValue, 49, 99),
    currentValue: clamp(leaf.currentValue, 49, 99),
    previousValue: clamp(leaf.previousValue ?? leaf.currentValue, 49, 99),
    snapshotDate: leaf.snapshotDate || todayStamp,
    horizonDays: [7, 30, 90, 180, 365, 1825].includes(Number(leaf.horizonDays))
      ? Number(leaf.horizonDays)
      : 30,
  })),
  showHiddenLeaves: normalizeLeafBoolean(state.showHiddenLeaves),
  organogram: {
    latest: state.organogram?.latest || null,
    history: Array.isArray(state.organogram?.history)
      ? state.organogram.history.slice(0, 5)
      : [],
  },
  nextStep: (() => {
    const sourceLeaf =
      (state.baseVariables || []).find((leaf) => leaf.id === state.nextStep?.leafId) ||
      leafSeed.find((leaf) => leaf.id === state.nextStep?.leafId) ||
      leafSeed[0];
    const built = buildNextStepSelection(sourceLeaf, state.nextStep?.selectedAt || now.toISOString(), {
      horizonDays: state.nextStep?.horizonDays,
      dueDateStamp: state.nextStep?.dueDateStamp,
      reminderShownForDateStamp: state.nextStep?.reminderShownForDateStamp,
    });
    return {
      ...built,
      leafId: state.nextStep?.leafId || built.leafId,
      text: String(state.nextStep?.text || built.text || ""),
      selectedAt: built.selectedAt,
      dueDateStamp: built.dueDateStamp,
      horizonDays: built.horizonDays,
      reminderShownForDateStamp: String(state.nextStep?.reminderShownForDateStamp || built.reminderShownForDateStamp || ""),
    };
  })(),
});

export const updateCardinalValue = (state, cardinalId, delta) => ({
  ...state,
  baseVariables: adjustCardinalLeaves(state.baseVariables, cardinalId, delta),
  updatedAt: new Date().toISOString(),
});

export const updateLeafValue = (state, leafId, delta) => ({
  ...state,
  baseVariables: state.baseVariables.map((leaf) =>
    leaf.id === leafId && isIncludedInCalculations(leaf)
      ? {
          ...leaf,
          currentValue: clamp(leaf.currentValue + delta, 49, 99),
        }
      : leaf
  ),
  updatedAt: new Date().toISOString(),
});

export const updateLeafHorizon = (state, leafId, horizonDays) => ({
  ...state,
  baseVariables: state.baseVariables.map((leaf) =>
    leaf.id === leafId && isIncludedInCalculations(leaf)
      ? { ...leaf, horizonDays: Number(horizonDays) }
      : leaf
  ),
  updatedAt: new Date().toISOString(),
});

export const setLeafCustomName = (state, leafId, customName) => ({
  ...state,
  baseVariables: state.baseVariables.map((leaf) =>
    leaf.id === leafId
      ? {
          ...leaf,
          customName: normalizeLeafCustomName(customName),
          name: normalizeLeafCustomName(customName) || leaf.defaultName || leaf.name,
        }
      : leaf
  ),
  updatedAt: new Date().toISOString(),
});

export const createLeafInNode = (state, { cardinalId, nodeId, nodeName, name }) => {
  const activeLeaves = getActiveLeaves(state.baseVariables).filter((leaf) => leaf.cardinalId === cardinalId);
  const seedValue = activeLeaves.length
    ? Math.round(average(activeLeaves.map((leaf) => leaf.currentValue)))
    : 74;
  const currentValue = clamp(seedValue, 49, 99);
  const newLeafName = String(name || "").trim();
  if (!newLeafName) return state;

  const leaf = createLeaf({
    id: createLeafId(cardinalId, nodeId, newLeafName),
    cardinalId,
    nodeId,
    nodeName,
    name: newLeafName,
    currentValue,
    targetValue: clamp(currentValue + 8, 49, 99),
    startValue: clamp(currentValue - 6, 49, 99),
    previousValue: currentValue,
    horizonDays: 90,
    note: `${newLeafName} dentro de ${nodeName}.`,
  });

  return {
    ...state,
    baseVariables: [...state.baseVariables, { ...leaf, defaultName: leaf.name }],
    updatedAt: new Date().toISOString(),
  };
};

export const toggleLeafHidden = (state, leafId) => ({
  ...state,
  baseVariables: state.baseVariables.map((leaf) =>
    leaf.id === leafId
      ? {
          ...leaf,
          hidden: !normalizeLeafBoolean(leaf.hidden),
        }
      : leaf
  ),
  updatedAt: new Date().toISOString(),
});

export const deleteLeaf = (state, leafId) => ({
  ...state,
  baseVariables: state.baseVariables.map((leaf) =>
    leaf.id === leafId
      ? {
          ...leaf,
          deleted: true,
          hidden: false,
        }
      : leaf
  ),
  nextStep:
    state.nextStep?.leafId === leafId
      ? (() => {
          const fallbackLeaf = getActiveLeaves(state.baseVariables).find((leaf) => leaf.id !== leafId) || null;
          return buildNextStepSelection(fallbackLeaf, new Date().toISOString());
        })()
      : state.nextStep,
  updatedAt: new Date().toISOString(),
});

export const setWeeklyReviewScore = (state, score) => ({
  ...state,
  weeklyReview: {
    ...state.weeklyReview,
    moodValue: score,
  },
  updatedAt: new Date().toISOString(),
});

export const setWeeklyReviewNote = (state, note) => ({
  ...state,
  weeklyReview: {
    ...state.weeklyReview,
    note,
  },
  updatedAt: new Date().toISOString(),
});

export const selectNextStep = (state, leaf) => ({
  ...state,
  nextStep: buildNextStepSelection(leaf, new Date().toISOString()),
  modalOpen: false,
  updatedAt: new Date().toISOString(),
});

export const setLeafSearchQuery = (state, query) => ({
  ...state,
  leafSearchQuery: query,
});

export const toggleModal = (state, modalOpen) => ({
  ...state,
  modalOpen,
});

export const toggleArchive = (state) => ({
  ...state,
  showArchive: !state.showArchive,
});

export const toggleShowHiddenLeaves = (state) => ({
  ...state,
  showHiddenLeaves: !state.showHiddenLeaves,
});

export const deriveCardinalValues = (baseVariables) => buildCardinalsFromLeaves(baseVariables);

export const mergeStateWithSeed = (savedState) => {
  const seedState = createDefaultState();
  if (savedState?.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return seedState;
  }

  const savedLeaves = new Map(
    (savedState?.baseVariables || []).map((leaf) => [leaf.id, leaf])
  );
  const mergedLeaves = seedState.baseVariables.map((seedLeaf) => {
    const savedLeaf = savedLeaves.get(seedLeaf.id);
    if (!savedLeaf) {
      return { ...seedLeaf, defaultName: seedLeaf.name, hidden: false, deleted: false };
    }

    const savedCustomName = normalizeLeafCustomName(savedLeaf.customName);
    const migratedCustomName =
      savedCustomName || (savedLeaf.name && savedLeaf.name !== seedLeaf.name ? savedLeaf.name : undefined);

    return {
      ...seedLeaf,
      ...savedLeaf,
      defaultName: seedLeaf.name,
      name: migratedCustomName || seedLeaf.name,
      customName: migratedCustomName,
      hidden: normalizeLeafBoolean(savedLeaf.hidden),
      deleted: normalizeLeafBoolean(savedLeaf.deleted),
    };
  });
  const appendedSavedLeaves = (savedState?.baseVariables || []).filter(
    (leaf) => !mergedLeaves.some((item) => item.id === leaf.id)
  );

  const mergedBaseVariables = [...mergedLeaves, ...appendedSavedLeaves.map((leaf) => ({
    ...leaf,
    customName: normalizeLeafCustomName(leaf.customName),
    defaultName: leaf.defaultName || leaf.name,
    name: normalizeLeafCustomName(leaf.customName) || leaf.name,
    hidden: normalizeLeafBoolean(leaf.hidden),
    deleted: normalizeLeafBoolean(leaf.deleted),
    currentValue: clamp(leaf.currentValue, 49, 99),
    startValue: clamp(leaf.startValue, 49, 99),
    targetValue: clamp(leaf.targetValue, 49, 99),
    previousValue: clamp(leaf.previousValue ?? leaf.currentValue, 49, 99),
    snapshotDate: leaf.snapshotDate || todayStamp,
  }))];
  const normalizedBaseVariables = mergedBaseVariables.map((leaf) => ({
    ...leaf,
    customName: normalizeLeafCustomName(leaf.customName),
    defaultName: leaf.defaultName || leaf.name,
    name: normalizeLeafCustomName(leaf.customName) || leaf.name,
    hidden: normalizeLeafBoolean(leaf.hidden),
    deleted: normalizeLeafBoolean(leaf.deleted),
  }));

  const defaultNextStepId = seedState.nextStep.leafId;
  const savedNextStepId = savedState?.nextStep?.leafId;
  const nextStepLeafId = getActiveLeaves(normalizedBaseVariables).some((leaf) => leaf.id === savedNextStepId)
    ? savedNextStepId
    : defaultNextStepId;

  const nextStepLeaf =
    normalizedBaseVariables.find((leaf) => leaf.id === nextStepLeafId) ||
    seedState.baseVariables.find((leaf) => leaf.id === nextStepLeafId) ||
    seedState.baseVariables[0];
  const savedNextStep = savedState?.nextStep || {};

  return normalizeState({
    ...seedState,
    ...savedState,
    baseVariables: normalizedBaseVariables,
    nextStep: buildNextStepSelection(nextStepLeaf, savedNextStep.selectedAt || seedState.nextStep.selectedAt, {
      horizonDays: savedNextStep.horizonDays,
      dueDateStamp: savedNextStep.dueDateStamp,
      reminderShownForDateStamp: savedNextStep.reminderShownForDateStamp,
    }),
  });
};

export const rolloverDailySnapshot = (state) => {
  const currentStamp = getLocalDateStamp();
  if (state?.snapshotDate === currentStamp) {
    return state;
  }

  return {
    ...state,
    snapshotDate: currentStamp,
    baseVariables: (state?.baseVariables || []).map((leaf) => ({
      ...leaf,
      previousValue: clamp(leaf.currentValue, 49, 99),
      snapshotDate: currentStamp,
    })),
  };
};
