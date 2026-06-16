import { average, progressBetween } from "../utils/calculations.js";
import { getMoodFromAverageValue } from "./moodService.js";

export const buildReviewSummary = (state) => {
  const cardinalValues = state.cardinals.map((item) => item.value);
  const leafChanges = state.baseVariables.filter(
    (item) => item.currentValue !== item.startValue
  );
  const mood = getMoodFromAverageValue(cardinalValues);

  return {
    averageCardinal: average(cardinalValues),
    changedLeaves: leafChanges.length,
    progressAverage:
      leafChanges.length === 0
        ? 0
        : average(
            leafChanges.map((leaf) =>
              progressBetween(leaf.startValue, leaf.currentValue, leaf.targetValue)
            )
          ),
    mood,
  };
};
