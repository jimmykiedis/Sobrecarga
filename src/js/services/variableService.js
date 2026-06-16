import { BaseVariable } from "../models/BaseVariable.js";
import { CardinalVariable } from "../models/CardinalVariable.js";
import { addDays } from "../utils/dates.js";
import { clamp } from "../utils/calculations.js";

const now = new Date();

const cardinalSeed = [
  { id: "identidade", name: "Identidade", value: 82, color: "#f59e0b", icon: "◌" },
  { id: "mental", name: "Saúde Mental", value: 74, color: "#8b5cf6", icon: "◐" },
  { id: "fisica", name: "Saúde Física", value: 68, color: "#10b981", icon: "◍" },
  { id: "familia", name: "Família", value: 77, color: "#ef4444", icon: "◑" },
  { id: "profissional", name: "Profissional", value: 71, color: "#0ea5e9", icon: "◓" },
];

const leafSeed = [
  new BaseVariable({
    id: "sono",
    cardinalId: "mental",
    name: "Sono consistente",
    startValue: 58,
    targetValue: 74,
    currentValue: 66,
    createdAt: addDays(now, -18),
    horizonDays: 90,
    note: "Dormir com horário previsível por duas semanas.",
    brothers: ["meditacao"],
  }),
  new BaseVariable({
    id: "meditacao",
    cardinalId: "mental",
    name: "Meditação curta",
    startValue: 61,
    targetValue: 79,
    currentValue: 64,
    createdAt: addDays(now, -12),
    horizonDays: 30,
    note: "Sessões curtas para baixar ruído mental.",
    brothers: ["sono"],
  }),
  new BaseVariable({
    id: "terapia",
    cardinalId: "mental",
    name: "Sessão de terapia",
    startValue: 70,
    targetValue: 83,
    currentValue: 74,
    createdAt: addDays(now, -46),
    horizonDays: 90,
    note: "Levar a pauta da semana com honestidade.",
  }),
  new BaseVariable({
    id: "caminhada",
    cardinalId: "fisica",
    name: "Caminhada diária",
    startValue: 55,
    targetValue: 73,
    currentValue: 62,
    createdAt: addDays(now, -8),
    horizonDays: 30,
    note: "Mover o corpo sem cobrança de performance.",
  }),
  new BaseVariable({
    id: "hidracao",
    cardinalId: "fisica",
    name: "Hidratação",
    startValue: 63,
    targetValue: 82,
    currentValue: 71,
    createdAt: addDays(now, -23),
    horizonDays: 30,
    note: "Garrafas cheias na mesa e na bolsa.",
  }),
  new BaseVariable({
    id: "alimentacao",
    cardinalId: "fisica",
    name: "Alimentação simples",
    startValue: 64,
    targetValue: 81,
    currentValue: 69,
    createdAt: addDays(now, -35),
    horizonDays: 90,
    note: "Planejar refeições com menos improviso.",
  }),
  new BaseVariable({
    id: "tempo-filho",
    cardinalId: "familia",
    name: "Tempo com meu filho",
    startValue: 67,
    targetValue: 81,
    currentValue: 72,
    createdAt: addDays(now, -15),
    horizonDays: 90,
    note: "Presença sem celular por alguns minutos.",
  }),
  new BaseVariable({
    id: "conversa-casal",
    cardinalId: "familia",
    name: "Conversa de alinhamento",
    startValue: 71,
    targetValue: 85,
    currentValue: 74,
    createdAt: addDays(now, -29),
    horizonDays: 90,
    note: "Escuta sem resolver tudo de uma vez.",
  }),
  new BaseVariable({
    id: "rotina-casa",
    cardinalId: "familia",
    name: "Rotina da casa",
    startValue: 59,
    targetValue: 78,
    currentValue: 63,
    createdAt: addDays(now, -61),
    horizonDays: 365,
    note: "Diminuir atrito nas tarefas domésticas.",
  }),
  new BaseVariable({
    id: "foco-profundo",
    cardinalId: "profissional",
    name: "Foco profundo",
    startValue: 60,
    targetValue: 79,
    currentValue: 67,
    createdAt: addDays(now, -20),
    horizonDays: 30,
    note: "Protejer blocos sem interrupção.",
  }),
  new BaseVariable({
    id: "priorizacao",
    cardinalId: "profissional",
    name: "Priorização da semana",
    startValue: 62,
    targetValue: 84,
    currentValue: 70,
    createdAt: addDays(now, -40),
    horizonDays: 30,
    note: "Escolher menos coisas com mais clareza.",
  }),
  new BaseVariable({
    id: "aprendizado",
    cardinalId: "profissional",
    name: "Aprendizado direcionado",
    startValue: 66,
    targetValue: 82,
    currentValue: 72,
    createdAt: addDays(now, -95),
    horizonDays: 365,
    note: "Ler e aplicar sem virar obrigação vazia.",
  }),
  new BaseVariable({
    id: "autoconhecimento",
    cardinalId: "identidade",
    name: "Autoconhecimento",
    startValue: 74,
    targetValue: 87,
    currentValue: 80,
    createdAt: addDays(now, -120),
    horizonDays: 365,
    note: "Registrar percepções sem censura.",
  }),
  new BaseVariable({
    id: "valores",
    cardinalId: "identidade",
    name: "Valores pessoais",
    startValue: 78,
    targetValue: 90,
    currentValue: 84,
    createdAt: addDays(now, -44),
    horizonDays: 365,
    note: "Voltar para o que realmente importa.",
  }),
];

export const createDefaultState = () => ({
  cardinals: cardinalSeed.map((item) => new CardinalVariable(item)),
  baseVariables: leafSeed.map((item) => ({ ...item })),
  weeklyReview: {
    moodValue: 0,
    moodLabel: "Neutro",
    progressionScore: 0,
    note: "",
  },
  nextStep: {
    leafId: leafSeed[0].id,
    text: leafSeed[0].name,
  },
  showArchive: false,
  leafSearchQuery: "",
  modalOpen: false,
  updatedAt: new Date().toISOString(),
});

export const normalizeState = (state) => ({
  ...state,
  cardinals: state.cardinals.map((cardinal) => ({
    ...cardinal,
    value: clamp(cardinal.value, 49, 99),
  })),
  baseVariables: state.baseVariables.map((leaf) => ({
    ...leaf,
    startValue: clamp(leaf.startValue, 49, 99),
    targetValue: clamp(leaf.targetValue, 49, 99),
    currentValue: clamp(leaf.currentValue, 49, 99),
  })),
});

export const updateCardinalValue = (state, cardinalId, delta) => ({
  ...state,
  cardinals: state.cardinals.map((cardinal) =>
    cardinal.id === cardinalId
      ? { ...cardinal, value: clamp(cardinal.value + delta, 49, 99) }
      : cardinal
  ),
  updatedAt: new Date().toISOString(),
});

export const updateLeafValue = (state, leafId, delta) => ({
  ...state,
  baseVariables: state.baseVariables.map((leaf) =>
    leaf.id === leafId
      ? { ...leaf, currentValue: clamp(leaf.currentValue + delta, 49, 99) }
      : leaf
  ),
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
  nextStep: {
    leafId: leaf.id,
    text: leaf.name,
  },
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
