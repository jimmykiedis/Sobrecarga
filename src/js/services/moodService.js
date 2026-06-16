import { average, clamp } from "../utils/calculations.js";

export const moodScale = [
  { min: 90, emoji: "😃", label: "Muito bem" },
  { min: 80, emoji: "🙂", label: "Bem" },
  { min: 70, emoji: "😐", label: "Neutro" },
  { min: 60, emoji: "😕", label: "Mal" },
  { min: 0, emoji: "😢", label: "Muito mal" },
];

export const moodOptions = [
  { value: -3, label: "Muito pior" },
  { value: -2, label: "Pior" },
  { value: -1, label: "Levemente pior" },
  { value: 0, label: "Neutro" },
  { value: 1, label: "Levemente melhor" },
  { value: 2, label: "Melhor" },
  { value: 3, label: "Muito melhor" },
];

export const getMoodFromAverageValue = (values) => {
  const score = clamp(average(values), 49, 99);
  return moodScale.find((entry) => score >= entry.min) || moodScale[moodScale.length - 1];
};

export const getMoodEmoji = (value) => getMoodFromAverageValue([value]).emoji;

export const getMoodLabel = (value) => getMoodFromAverageValue([value]).label;
