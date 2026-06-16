import { renderRadarChart } from "./radarChart.js";
import { renderStatusBar, statusLabels } from "./moodPanel.js";
import { renderLeafModal } from "./adviceModal.js";
import { average, progressBetween, formatPercent } from "../utils/calculations.js";
import { formatDateTime, horizonLabel, horizonOptions, horizonValueToIndex } from "../utils/dates.js";
import { findLeaves } from "../services/adviceService.js";
import { buildReviewSummary } from "../services/reviewService.js";

const leafToneClass = (value) => {
  if (value >= 90) return "tone-excellent";
  if (value >= 80) return "tone-healthy";
  if (value >= 70) return "tone-steady";
  if (value >= 60) return "tone-attention";
  return "tone-critical";
};

const horizonToneClass = (value) => {
  const index = horizonValueToIndex(value);
  return `horizon-tone horizon-tone--${index}`;
};

export const createDashboardMarkup = (state) => {
  const summary = buildReviewSummary(state);
  const openNodeKeys = new Set(state.ui?.openNodeKeys || []);
  const radarItems = state.cardinals.map((item) => ({
    ...item,
    value: item.value,
  }));

  const filteredLeaves = findLeaves(
    state.baseVariables.map((leaf) => ({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
    })),
    state.leafSearchQuery
  );

  const currentNextLeafRaw =
    state.baseVariables.find((leaf) => leaf.id === state.nextStep.leafId) || state.baseVariables[0];
  const currentNextLeaf = currentNextLeafRaw
    ? {
        ...currentNextLeafRaw,
        cardinalName: state.cardinals.find((item) => item.id === currentNextLeafRaw.cardinalId)?.name || "",
        horizonLabel: horizonLabel(currentNextLeafRaw.horizonDays),
      }
    : null;

  const changedLeaves = state.baseVariables
    .filter((leaf) => leaf.currentValue !== leaf.startValue)
    .map((leaf) => ({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
      previousValue: leaf.previousValue ?? leaf.currentValue,
      progress: progressBetween(leaf.startValue, leaf.currentValue, leaf.targetValue),
    }));
  const recentChangedLeaves = changedLeaves.slice(0, 8);
  const remainingChangedLeaves = Math.max(0, changedLeaves.length - recentChangedLeaves.length);

  const avgCardinal = average(state.cardinals.map((item) => item.value));
  const moodEmoji = summary.mood.emoji;
  const buildNodeGroups = (cardinalId) => {
    const nodes = new Map();
    state.baseVariables
      .filter((leaf) => leaf.cardinalId === cardinalId)
      .forEach((leaf) => {
        const nodeName = leaf.nodeName || "Sem grupo";
        if (!nodes.has(nodeName)) {
          nodes.set(nodeName, []);
        }
        nodes.get(nodeName).push({
          ...leaf,
          cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
          horizonLabel: horizonLabel(leaf.horizonDays),
          progress: progressBetween(leaf.startValue, leaf.currentValue, leaf.targetValue),
        });
      });

    return [...nodes.entries()].map(([nodeName, leaves]) => ({
      nodeName,
      key: `${cardinalId}::${nodeName}`,
      isOpen: openNodeKeys.has(`${cardinalId}::${nodeName}`),
      leaves,
    }));
  };

  return `
    <div class="shell">
      <header class="topbar" data-dashboard-section="topbar">
        <div class="brand-mark">
          <span class="brand-mark__badge">S</span>
          <div>
            <p class="eyebrow">Sobrecarga</p>
            <h1>Menu principal</h1>
          </div>
        </div>
        <div class="topbar__actions">
          <div class="status-pill">
            <span data-summary="mood-emoji">${moodEmoji}</span>
            <span data-summary="mood-label">${summary.mood.label}</span>
          </div>
          <div class="status-pill status-pill--sync">
            <span>${state.ui?.dirty ? "•" : "✓"}</span>
            <span data-summary="sync-message">${state.ui?.syncMessage || "Salvo localmente"}</span>
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

      <section class="hero card card--hero" data-dashboard-section="hero">
        <div class="hero__text">
          <p class="eyebrow">Sessão atual</p>
          <h2>Clareza emocional em duas telas, com as 11 cards já prontas para uso.</h2>
          <p class="hero__copy">
            O foco é revisar como você está, o que mudou e qual passo concreto merece atenção agora.
          </p>
          <div class="hero__stats">
            <div class="stat">
              <span class="stat__label">Cardinais</span>
              <strong data-summary="hero-average-cardinal">${formatPercent(avgCardinal)}</strong>
            </div>
            <div class="stat">
              <span class="stat__label">Folhas alteradas</span>
              <strong data-summary="hero-changed-leaves">${changedLeaves.length}</strong>
            </div>
            <div class="stat">
              <span class="stat__label">Atualizado em</span>
              <strong data-summary="hero-updated-at">${formatDateTime(state.updatedAt)}</strong>
            </div>
            <div class="stat">
              <span class="stat__label">Sincronização</span>
              <strong data-summary="hero-last-saved-at">${state.ui?.lastSavedAt ? formatDateTime(state.ui.lastSavedAt) : "Ainda não enviado"}</strong>
            </div>
          </div>
        </div>
        <div class="hero__art">
          <div class="hero__emoji">${moodEmoji}</div>
          <p>Último estado emocional: <strong>${summary.mood.label}</strong></p>
        </div>
      </section>

      <section class="dashboard-grid">
        <article class="card dashboard-card dashboard-card--wide" data-dashboard-section="overview">
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
                <li><span>Estado emocional</span><strong data-summary="overview-mood">${summary.mood.label}</strong></li>
                <li><span>Média das cardinais</span><strong data-summary="overview-average-cardinal">${summary.averageCardinal.toFixed(1)}</strong></li>
                <li><span>Progresso médio das folhas alteradas</span><strong data-summary="overview-progress-average">${summary.progressAverage.toFixed(1)}%</strong></li>
                <li><span>Próximo passo</span><strong data-summary="overview-next-step">${currentNextLeaf?.name || "Definir"}</strong></li>
              </ul>
            </div>
            <div class="overview-panel overview-panel--chart" data-dashboard-section="overview-chart">
              ${renderRadarChart(radarItems)}
            </div>
          </div>
        </article>

        <article class="card dashboard-card" data-dashboard-section="cardinals">
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
                  <div class="cardinal-row" data-cardinal-id="${cardinal.id}" style="--card-color:${cardinal.color}">
                    <div class="cardinal-row__meta">
                      <span class="cardinal-row__icon">${cardinal.icon}</span>
                      <div>
                        <strong>${cardinal.name}</strong>
                        <small>${cardinal.id}</small>
                      </div>
                    </div>
                    <div class="cardinal-stepper">
                      <button type="button" class="stepper-button stepper-button--danger" data-action="cardinal-delta" data-cardinal-id="${cardinal.id}" data-delta="-1">−</button>
                      <div class="stepper-value" data-cardinal-value="${cardinal.id}">${cardinal.value}</div>
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
            const nodeGroups = buildNodeGroups(cardinal.id);
            return `
              <article class="card dashboard-card" data-dashboard-section="cardinal-panel" data-cardinal-id="${cardinal.id}">
                <header class="card__header">
                  <div>
                    <p class="eyebrow">Card ${index + 3}</p>
                    <h3>${cardinal.name}</h3>
                  </div>
                  <span class="chip chip--filled" style="--chip-color:${cardinal.color}">${state.baseVariables.filter((leaf) => leaf.cardinalId === cardinal.id).length} folhas</span>
                </header>
                <div class="node-stack">
                  ${nodeGroups
                    .map(
                      (node) => `
                    <section class="node-card">
                          <button
                            type="button"
                            class="node-card__header ${node.isOpen ? "is-open" : ""}"
                            data-action="toggle-node"
                            data-node-key="${node.key}"
                            data-cardinal-id="${cardinal.id}"
                            aria-expanded="${node.isOpen ? "true" : "false"}"
                          >
                            <div>
                              <h4>${node.nodeName}</h4>
                            </div>
                            <span class="chip">${node.leaves.length} folhas</span>
                          </button>
                          <div class="leaf-stack ${node.isOpen ? "is-open" : ""}">
                            ${node.leaves
                              .map(
                                (leaf) => `
                                  <div class="leaf-item ${leafToneClass(leaf.currentValue)} ${horizonToneClass(leaf.horizonDays)}" data-leaf-id="${leaf.id}">
                                    <div class="leaf-item__heading">
                                      <strong>${leaf.name}</strong>
                                    </div>
                                    <div class="leaf-value-box">
                                      <button type="button" class="stepper-button stepper-button--danger stepper-button--tiny" data-action="leaf-delta" data-leaf-id="${leaf.id}" data-delta="-1">−</button>
                                      <div class="leaf-value-box__value" data-leaf-value="${leaf.id}">${leaf.currentValue}</div>
                                      <button type="button" class="stepper-button stepper-button--success stepper-button--tiny" data-action="leaf-delta" data-leaf-id="${leaf.id}" data-delta="1">+</button>
                                    </div>
                                    <div class="leaf-horizon ${horizonToneClass(leaf.horizonDays)}">
                                      <input
                                        type="range"
                                        min="0"
                                        max="${horizonOptions.length - 1}"
                                        step="1"
                                        value="${horizonValueToIndex(leaf.horizonDays)}"
                                        data-field="leaf-horizon"
                                        data-leaf-id="${leaf.id}"
                                        data-leaf-horizon-input="${leaf.id}"
                                        style="--horizon-accent: var(--horizon-${horizonValueToIndex(leaf.horizonDays) + 1});"
                                        aria-label="Selecionar prazo de ${leaf.name}"
                                      />
                                      <span class="leaf-horizon__current" data-leaf-horizon-label="${leaf.id}">${horizonLabel(leaf.horizonDays)}</span>
                                    </div>
                                  </div>
                                `
                              )
                              .join("")}
                          </div>
                        </section>
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
              <p>${currentNextLeaf?.cardinalName || ""} • ${currentNextLeaf?.nodeName || ""} • ${currentNextLeaf ? currentNextLeaf.currentValue : "--"} • ${currentNextLeaf ? currentNextLeaf.horizonLabel : ""}</p>
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
            <article class="card dashboard-card dashboard-card--wide" data-dashboard-section="archive">
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

            <article class="card dashboard-card dashboard-card--wide" data-dashboard-section="progress">
                <header class="card__header">
                  <div>
                    <p class="eyebrow">Card 11</p>
                    <h3>Histórico das folhas alteradas</h3>
                  </div>
                </header>
              ${
                recentChangedLeaves.length
                  ? `
                    <div class="progress-table-shell">
                      <table class="progress-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Início</th>
                            <th>Valor Anterior</th>
                            <th>Valor Atual</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${recentChangedLeaves
                            .map(
                                (leaf) => `
                                  <tr>
                                    <td data-label="Nome">
                                      <strong>${leaf.name}</strong>
                                      <span>${leaf.cardinalName}</span>
                                    </td>
                                    <td data-label="Início">${leaf.startValue}</td>
                                    <td data-label="Valor Anterior">${leaf.previousValue}</td>
                                    <td data-label="Valor Atual">${leaf.currentValue}</td>
                                  </tr>
                                `
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </div>
                  `
                  : `<p class="empty-state">Nenhuma folha foi alterada ainda.</p>`
              }
            </article>

            <article class="card dashboard-card dashboard-card--wide" data-dashboard-section="cardinals-summary">
              <header class="card__header">
                <div>
                  <p class="eyebrow">Card 12</p>
                  <h3>Resumo rápido dos cardinais</h3>
                </div>
              </header>
              <div class="progress-table-shell progress-table-shell--compact">
                <table class="progress-table progress-table--compact">
                  <thead>
                    <tr>
                      <th>Cardinal</th>
                      <th>Valor</th>
                      <th>Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${state.cardinals
                      .map((cardinal) => {
                        const related = state.baseVariables.filter((leaf) => leaf.cardinalId === cardinal.id);
                        const leafAverage = related.length
                          ? average(related.map((leaf) => leaf.currentValue))
                          : cardinal.value;
                        return `
                          <tr>
                            <td data-label="Cardinal">
                              <strong>${cardinal.name}</strong>
                              <span>${related.length} folhas</span>
                            </td>
                            <td data-label="Valor">${cardinal.value}</td>
                            <td data-label="Média">${leafAverage.toFixed(1)}</td>
                          </tr>
                        `;
                      })
                      .join("")}
                  </tbody>
                </table>
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
