import { renderRadarChart } from "./radarChart.js";
import { renderStatusBar, statusLabels } from "./moodPanel.js";
import { renderLeafModal } from "./adviceModal.js";
import { average, progressBetween, formatPercent } from "../utils/calculations.js";
import { formatDateTime, horizonLabel } from "../utils/dates.js";
import { findLeaves } from "../services/adviceService.js";
import { buildReviewSummary } from "../services/reviewService.js";

const leafToneClass = (value) => {
  if (value >= 90) return "tone-excellent";
  if (value >= 80) return "tone-healthy";
  if (value >= 70) return "tone-steady";
  if (value >= 60) return "tone-attention";
  return "tone-critical";
};

export const createDashboardMarkup = (state) => {
  const summary = buildReviewSummary(state);
  const radarItems = state.cardinals.map((item) => ({
    ...item,
    value: item.value,
  }));
  const leavesByCardinal = new Map();
  state.cardinals.forEach((cardinal) => leavesByCardinal.set(cardinal.id, []));
  state.baseVariables.forEach((leaf) => {
    if (!leavesByCardinal.has(leaf.cardinalId)) {
      leavesByCardinal.set(leaf.cardinalId, []);
    }
    leavesByCardinal.get(leaf.cardinalId).push({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
      progress: progressBetween(leaf.startValue, leaf.currentValue, leaf.targetValue),
    });
  });

  const filteredLeaves = findLeaves(
    state.baseVariables.map((leaf) => ({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
    })),
    state.leafSearchQuery
  );

  const currentNextLeaf =
    state.baseVariables.find((leaf) => leaf.id === state.nextStep.leafId) || state.baseVariables[0];

  const changedLeaves = state.baseVariables
    .filter((leaf) => leaf.currentValue !== leaf.startValue)
    .map((leaf) => ({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
      progress: progressBetween(leaf.startValue, leaf.currentValue, leaf.targetValue),
    }));

  const avgCardinal = average(state.cardinals.map((item) => item.value));
  const moodEmoji = summary.mood.emoji;

  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand-mark">
          <span class="brand-mark__badge">S</span>
          <div>
            <p class="eyebrow">Sobrecarga</p>
            <h1>Menu principal</h1>
          </div>
        </div>
        <div class="topbar__actions">
          <div class="status-pill">
            <span>${moodEmoji}</span>
            <span>${summary.mood.label}</span>
          </div>
          <div class="status-pill status-pill--sync">
            <span>${state.ui?.dirty ? "•" : "✓"}</span>
            <span>${state.ui?.syncMessage || "Salvo localmente"}</span>
          </div>
          <button
            type="button"
            class="button button--soft"
            data-action="save-firestore"
            ${state.ui?.saving ? "disabled" : ""}
          >
            ${state.ui?.saving ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" class="button button--ghost" data-action="sign-out">Sair</button>
        </div>
      </header>

      <section class="hero card card--hero">
        <div class="hero__text">
          <p class="eyebrow">Sessão atual</p>
          <h2>Clareza emocional em duas telas, com as 11 cards já prontas para uso.</h2>
          <p class="hero__copy">
            O foco é revisar como você está, o que mudou e qual passo concreto merece atenção agora.
          </p>
          <div class="hero__stats">
            <div class="stat">
              <span class="stat__label">Cardinais</span>
              <strong>${formatPercent(avgCardinal)}</strong>
            </div>
            <div class="stat">
              <span class="stat__label">Folhas alteradas</span>
              <strong>${changedLeaves.length}</strong>
            </div>
            <div class="stat">
              <span class="stat__label">Atualizado em</span>
              <strong>${formatDateTime(state.updatedAt)}</strong>
            </div>
            <div class="stat">
              <span class="stat__label">Sincronização</span>
              <strong>${state.ui?.lastSavedAt ? formatDateTime(state.ui.lastSavedAt) : "Ainda não enviado"}</strong>
            </div>
          </div>
        </div>
        <div class="hero__art">
          <div class="hero__emoji">${moodEmoji}</div>
          <p>Último estado emocional: <strong>${summary.mood.label}</strong></p>
        </div>
      </section>

      <section class="dashboard-grid">
        <article class="card dashboard-card dashboard-card--wide">
          <header class="card__header">
            <div>
              <p class="eyebrow">Card 1</p>
              <h3>Resumo simples e radar</h3>
            </div>
          </header>
          <div class="overview-grid">
            <div class="overview-panel">
              <p class="overview-panel__title">Resumo</p>
              <ul class="summary-list">
                <li><span>Estado emocional</span><strong>${summary.mood.label}</strong></li>
                <li><span>Média das cardinais</span><strong>${summary.averageCardinal.toFixed(1)}</strong></li>
                <li><span>Progresso médio das folhas alteradas</span><strong>${summary.progressAverage.toFixed(1)}%</strong></li>
                <li><span>Próximo passo</span><strong>${currentNextLeaf?.name || "Definir"}</strong></li>
              </ul>
            </div>
            <div class="overview-panel overview-panel--chart">
              ${renderRadarChart(radarItems)}
            </div>
          </div>
        </article>

        <article class="card dashboard-card">
          <header class="card__header">
            <div>
              <p class="eyebrow">Card 2</p>
              <h3>Variáveis cardinais</h3>
            </div>
          </header>
          <div class="cardinal-list">
            ${state.cardinals
              .map(
                (cardinal) => `
                  <div class="cardinal-row" style="--card-color:${cardinal.color}">
                    <div class="cardinal-row__meta">
                      <span class="cardinal-row__icon">${cardinal.icon}</span>
                      <div>
                        <strong>${cardinal.name}</strong>
                        <small>${cardinal.id}</small>
                      </div>
                    </div>
                    <div class="cardinal-stepper">
                      <button type="button" class="stepper-button stepper-button--danger" data-action="cardinal-delta" data-cardinal-id="${cardinal.id}" data-delta="-1">−</button>
                      <div class="stepper-value">${cardinal.value}</div>
                      <button type="button" class="stepper-button stepper-button--success" data-action="cardinal-delta" data-cardinal-id="${cardinal.id}" data-delta="1">+</button>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>

        ${state.cardinals
          .map((cardinal, index) => {
            const leafs = leavesByCardinal.get(cardinal.id) || [];
            return `
              <article class="card dashboard-card">
                <header class="card__header">
                  <div>
                    <p class="eyebrow">Card ${index + 3}</p>
                    <h3>${cardinal.name}</h3>
                  </div>
                  <span class="chip chip--filled" style="--chip-color:${cardinal.color}">${leafs.length} folhas</span>
                </header>
                <div class="leaf-stack">
                  ${leafs
                    .map(
                      (leaf) => `
                        <div class="leaf-item ${leafToneClass(leaf.currentValue)}">
                          <div class="leaf-item__heading">
                            <strong>${leaf.name}</strong>
                            <span>${leaf.currentValue}</span>
                          </div>
                          <div class="leaf-item__meta">
                            <span>Início ${leaf.startValue}</span>
                            <span>Meta ${leaf.targetValue}</span>
                            <span>${leaf.horizonLabel}</span>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `;
          })
          .join("")}

        <article class="card dashboard-card dashboard-card--wide">
          <header class="card__header">
            <div>
              <p class="eyebrow">Card 8</p>
              <h3>Como foi o nosso desenvolvimento desde que definimos este passo?</h3>
            </div>
          </header>
          <div class="review-panel">
            <p class="review-panel__score">
              Resultado atual:
              <strong>
                ${state.weeklyReview.moodValue > 0 ? "+" : ""}
                ${state.weeklyReview.moodValue}
              </strong>
              <span>${statusLabels[state.weeklyReview.moodValue] || "Neutro"}</span>
            </p>
            ${renderStatusBar(state.weeklyReview.moodValue)}
            <label class="field">
              <span>Observações rápidas</span>
              <textarea rows="3" data-field="weekly-review-note" placeholder="O que avançou, travou ou ficou mais claro?">${state.weeklyReview.note || ""}</textarea>
            </label>
          </div>
        </article>

        <article class="card dashboard-card dashboard-card--wide">
          <header class="card__header">
            <div>
              <p class="eyebrow">Card 9</p>
              <h3>Qual é o próximo passo concreto que melhoraria minha vida nos próximos 7 dias?</h3>
            </div>
            <button type="button" class="button button--soft" data-action="open-modal">Procurar folhas</button>
          </header>
          <div class="next-step-panel">
            <div>
              <p class="next-step-panel__label">Folha escolhida</p>
              <strong>${currentNextLeaf?.name || "Nenhuma folha selecionada"}</strong>
              <p>${currentNextLeaf?.cardinalName || ""} • ${currentNextLeaf ? currentNextLeaf.currentValue : "--"} • ${currentNextLeaf ? currentNextLeaf.horizonLabel : ""}</p>
            </div>
            <label class="field">
              <span>Frase do próximo passo</span>
              <textarea rows="3" data-field="next-step-text" placeholder="Escreva a ação concreta...">${state.nextStep.text || ""}</textarea>
            </label>
          </div>
        </article>

        <div class="hidden-panels-shell">
          <div class="archive-toggle">
            <button type="button" class="button button--ghost" data-action="toggle-archive" aria-expanded="${state.showArchive ? "true" : "false"}">...</button>
          </div>

          <div class="hidden-panels ${state.showArchive ? "is-open" : ""}">
            <article class="card dashboard-card dashboard-card--wide">
              <header class="card__header">
                <div>
                  <p class="eyebrow">Card 10</p>
                  <h3>Progresso das folhas alteradas</h3>
                </div>
              </header>
              <div class="archive-panel">
                ${changedLeaves.length
                  ? `
                    <div class="archive-list">
                      ${changedLeaves
                        .map(
                          (leaf) => `
                            <div class="archive-row">
                              <div>
                                <strong>${leaf.name}</strong>
                                <small>${leaf.cardinalName}</small>
                              </div>
                              <div class="archive-row__numbers">
                                <span>Início ${leaf.startValue}</span>
                                <span>Meta ${leaf.targetValue}</span>
                                <span>Atual ${leaf.currentValue}</span>
                              </div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  `
                  : `<p class="empty-state">Nenhuma folha foi alterada ainda.</p>`}
              </div>
            </article>

            <article class="card dashboard-card dashboard-card--wide">
              <header class="card__header">
                <div>
                  <p class="eyebrow">Card 11</p>
                  <h3>Progresso médio das variáveis cardinais</h3>
                </div>
              </header>
              <div class="progress-chart" role="img" aria-label="Gráfico mostrando o progresso médio das variáveis cardinais">
                ${state.cardinals
                  .map((cardinal) => {
                    const related = state.baseVariables.filter((leaf) => leaf.cardinalId === cardinal.id);
                    const leafAverage = related.length
                      ? average(related.map((leaf) => leaf.currentValue))
                      : cardinal.value;
                    const width = Math.max(10, ((leafAverage - 49) / 50) * 100);
                    return `
                      <div class="progress-row">
                        <div class="progress-row__meta">
                          <strong>${cardinal.name}</strong>
                          <span>${leafAverage.toFixed(1)}</span>
                        </div>
                        <div class="progress-bar">
                          <div class="progress-bar__fill" style="width:${width}%; --bar-color:${cardinal.color}"></div>
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer class="dashboard-footer">
        <button
          type="button"
          class="button button--soft"
          data-action="save-firestore"
          ${state.ui?.saving ? "disabled" : ""}
        >
          ${state.ui?.saving ? "Salvando..." : "Salvar"}
        </button>
      </footer>
    </div>

    ${state.modalOpen ? renderLeafModal({ leaves: filteredLeaves, query: state.leafSearchQuery, selectedLeafId: state.nextStep.leafId }) : ""}
  `;
};
