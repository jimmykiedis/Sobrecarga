export const statusScale = [-3, -2, -1, 0, 1, 2, 3];

export const statusLabels = {
  "-3": "Muito pior",
  "-2": "Pior",
  "-1": "Levemente pior",
  0: "Neutro",
  1: "Levemente melhor",
  2: "Melhor",
  3: "Muito melhor",
};

export const renderStatusBar = (selectedValue) => {
  const activeIndex = statusScale.indexOf(Number(selectedValue));
  const labels = statusScale
    .map(
      (value, index) => `
        <button
          type="button"
          class="status-bar__step ${index === activeIndex ? "is-active" : ""}"
          data-action="set-weekly-score"
          data-value="${value}"
          data-weekly-score-step="${value}"
          aria-label="${statusLabels[value]}"
        >
          <span>${value > 0 ? "+" : ""}${value}</span>
        </button>
      `
    )
    .join("");

  const ticks = statusScale
    .map(
      (value, index) => `
        <span
          class="status-bar__label ${index === activeIndex ? "is-active" : ""}"
          data-weekly-score-label="${value}"
        >
          ${statusLabels[value]}
        </span>
      `
    )
    .join("");

  return `
    <div class="status-bar" data-role="weekly-score">
      <div class="status-bar__track">
        <input
          type="range"
          min="-3"
          max="3"
          step="1"
          value="${selectedValue}"
          data-field="weekly-review-score"
          aria-label="Status da semana"
        />
        <div class="status-bar__steps">
          ${labels}
        </div>
      </div>
      <div class="status-bar__labels">
        ${ticks}
      </div>
    </div>
  `;
};
