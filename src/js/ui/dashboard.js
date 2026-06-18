import { renderRadarChart } from "./radarChart.js";
import { renderStatusBar, statusLabels } from "./moodPanel.js";
import { renderLeafModal } from "./adviceModal.js";
import { renderOrganogramSvg } from "./organogram.js";
import { getActiveLeaves, getLeafDisplayName } from "../services/variableService.js";
import { pickDashboardPhrase } from "../services/inspirationService.js";
import { average, progressBetween, formatPercent } from "../utils/calculations.js";
import {
  formatDate,
  formatDateTime,
  getLocalDateStamp,
  horizonLabel,
  horizonOptions,
  horizonValueToIndex,
} from "../utils/dates.js";
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

const leafHelpExamples = [
  { match: /sono/i, text: "horas dormidas, regularidade do horário de dormir e sensação ao acordar" },
  { match: /energia/i, text: "disposição ao longo do dia, fadiga e capacidade de manter o ritmo" },
  { match: /exerc/i, text: "frequência de treino, constância e recuperação física" },
  { match: /aliment/i, text: "qualidade das refeições, constância e relação com a comida" },
  { match: /peso/i, text: "tendência corporal e controle do peso no tempo" },
  { match: /condicion/i, text: "fôlego, resistência e capacidade física geral" },
  { match: /exame/i, text: "exames, check-ups e acompanhamento de saúde" },
  { match: /humor/i, text: "estabilidade emocional do dia e variações de humor" },
  { match: /estresse/i, text: "pressão percebida, tensão e sobrecarga" },
  { match: /ansiedad/i, text: "preocupação, agitação e nível de ansiedade percebido" },
  { match: /autoconhecimento/i, text: "clareza sobre si, padrões pessoais e consciência emocional" },
  { match: /terapia/i, text: "constância do processo terapêutico e efeito prático dele" },
  { match: /equil/i, text: "capacidade de regular emoções e manter estabilidade interna" },
  { match: /sobrecarga/i, text: "volume de demandas mentais e sensação de excesso" },
  { match: /burnout/i, text: "risco de exaustão por excesso de pressão e trabalho" },
  { match: /valores?/i, text: "clareza do que importa e coerência nas escolhas" },
  { match: /princ/i, text: "coerência entre convicção e comportamento" },
  { match: /prop[oó]sito/i, text: "sentido, direção e motivo para agir" },
  { match: /legado/i, text: "o que você quer deixar para o futuro e para os outros" },
  { match: /solid[aã]o/i, text: "nível de isolamento e necessidade de conexão" },
  { match: /futuro/i, text: "clareza de direção e confiança no que vem pela frente" },
  { match: /rede de apoio/i, text: "pessoas que sustentam, acolhem e ajudam de verdade" },
  { match: /socializa/i, text: "contato, convivência e abertura para se relacionar" },
  { match: /tempo de qualidade/i, text: "presença real, atenção e vínculo com quem importa" },
  { match: /educa/i, text: "aprendizado, formação e apoio ao desenvolvimento" },
  { match: /rotina/i, text: "regularidade, previsibilidade e organização do dia a dia" },
  { match: /finan/i, text: "organização do dinheiro, segurança e pressão financeira" },
  { match: /comunica/i, text: "clareza, alinhamento e qualidade da conversa" },
  { match: /gastos/i, text: "controle de saída de dinheiro e previsibilidade financeira" },
  { match: /sa[uú]de/i, text: "cuidado prático com bem-estar, prevenção e sinais do corpo" },
  { match: /agenda/i, text: "organização de horários e cumprimento do combinado" },
  { match: /compromiss/i, text: "cumprimento de responsabilidades e acordos" },
  { match: /opera/i, text: "execução do dia a dia e fluidez da operação" },
  { match: /crescimento/i, text: "expansão, avanço e geração de escala" },
  { match: /equipe/i, text: "alinhamento, colaboração e funcionamento do time" },
  { match: /receita/i, text: "entrada de dinheiro e previsibilidade comercial" },
  { match: /lucro/i, text: "resultado final depois das despesas" },
  { match: /funcion[aá]rios/i, text: "saúde do time, quantidade e qualidade do quadro" },
  { match: /projetos/i, text: "andamento das iniciativas em curso" },
  { match: /problemas cr[ií]ticos/i, text: "pendências urgentes que exigem ação imediata" },
  { match: /fluxo de caixa/i, text: "entrada e saída de dinheiro no curto prazo" },
  { match: /sobrecarga de trabalho/i, text: "acúmulo de tarefas e pressão operacional" },
  { match: /riscos do neg[oó]cio/i, text: "exposição a problemas que podem afetar a empresa" },
];

const getLeafHelpExample = (leafName = "") => {
  const normalized = String(leafName || "").trim();
  const match = leafHelpExamples.find((item) => item.match.test(normalized));
  return match?.text || "o comportamento, resultado ou sensação concreta que a palavra sugere no seu dia a dia";
};

const renderNextStepLeafContext = (leaf, nextStep) => {
  if (!leaf) {
    return `
      <p class="empty-state">Selecione uma folha no card 9 para mostrar aqui o próximo passo concreto.</p>
    `;
  }

  const cardinalName = nextStep?.cardinalName || leaf.cardinalName || "";
  const nodeName = leaf.nodeName || "Sem n\u00F3";
  const dueDate = nextStep?.dueDateStamp ? formatDate(nextStep.dueDateStamp) : "Sem prazo";
  const selectedAt = nextStep?.selectedAt ? formatDateTime(nextStep.selectedAt) : "Sem registro";

  return `
    <div class="next-step-panel__context">
      <p class="next-step-panel__label">Folha escolhida</p>
      <strong>${getLeafDisplayName(leaf)}</strong>
      <p>${cardinalName} \u2022 ${nodeName} \u2022 ${leaf.currentValue} \u2022 ${horizonLabel(nextStep?.horizonDays || leaf.horizonDays)}</p>
      <p class="panel-note">
        Definida em ${selectedAt} • vence em ${dueDate}
      </p>
    </div>
  `;
};

const renderNextStepReminderModal = ({
  currentNextLeaf,
  nextStep,
  weeklyReviewScore,
  weeklyReviewNote = "",
  motivationalMessage,
  syncMessage = "",
}) => `
  <div class="modal modal--reminder is-open" role="dialog" aria-modal="true" aria-labelledby="next-step-reminder-title">
    <div class="modal__backdrop" data-action="close-next-step-reminder"></div>
    <div class="modal__panel modal__panel--reminder">
      <header class="modal__header">
        <div>
          <p class="eyebrow">Card 8</p>
          <h3 id="next-step-reminder-title">Como foi o nosso desenvolvimento desde que definimos este passo?</h3>
        </div>
        <button type="button" class="icon-button" data-action="close-next-step-reminder" aria-label="Fechar lembrete">x</button>
      </header>
      <div class="review-panel">
        ${renderNextStepLeafContext(currentNextLeaf, nextStep)}
        <div class="next-step-panel__motivation">
          <p class="eyebrow">Mensagem do dia</p>
          <p>${motivationalMessage || "Carregando mensagem personalizada..."}</p>
        </div>
        <div class="next-step-panel__sync">
          <p class="eyebrow">Sincronização</p>
          <p>${syncMessage || "Sincronizando em segundo plano..."}</p>
        </div>
        <p class="review-panel__score">
          Resultado atual:
          <strong data-weekly-review-score-current>${weeklyReviewScore > 0 ? "+" : ""}${weeklyReviewScore}</strong>
          <span data-weekly-review-score-label>${statusLabels[weeklyReviewScore] || "Neutro"}</span>
        </p>
        ${renderStatusBar(weeklyReviewScore)}
        <label class="field">
          <span>Observações rápidas</span>
          <textarea rows="3" data-field="weekly-review-note" placeholder="O que avançou, travou ou ficou mais claro?">${weeklyReviewNote}</textarea>
        </label>
        <p class="panel-note">O texto acima fica como rascunho até clicar em Feito.</p>
      </div>
      <footer class="card__footer card__footer--split">
        <button type="button" class="button button--ghost" data-action="close-next-step-reminder">Depois</button>
        <button type="button" class="button button--soft" data-action="commit-weekly-review">Feito</button>
      </footer>
    </div>
  </div>
`;

export const renderDashboardHelpModal = () => `
  <div class="modal modal--dashboard-help is-open" role="dialog" aria-modal="true" aria-labelledby="dashboard-help-title">
    <div class="modal__backdrop" data-action="close-dashboard-help"></div>
    <div class="modal__panel modal__panel--dashboard-help">
      <header class="modal__header">
        <div>
          <p class="eyebrow">Ajuda rápida</p>
          <h3 id="dashboard-help-title">Como ler e ajustar os cards</h3>
        </div>
        <button type="button" class="icon-button" data-action="close-dashboard-help" aria-label="Fechar ajuda">x</button>
      </header>
      <div class="dashboard-help">
        <section class="dashboard-help__card">
          <h4>Quando usar + e -</h4>
          <p>
            Nos cards cardinais, aumente o valor quando a área como um todo avançou de forma real: você ganhou consistência, tirou peso daquele setor ou ficou mais perto do que quer viver.
          </p>
          <p>
            Nas folhas, aumente quando o comportamento ou resultado específico melhorou. Diminua quando houve retrocesso, abandono do hábito, piora perceptível ou perda de alinhamento com o objetivo.
          </p>
        </section>
        <section class="dashboard-help__card">
          <h4>Como interpretar o número</h4>
          <p>
            O valor não é nota moral. Ele mostra o estado atual daquela área: quanto maior, mais favorável e estável; quanto menor, mais atenção e cuidado ela pede.
          </p>
          <p>
            Use os ajustes para refletir a realidade recente, não a intenção. Se algo mudou nos últimos dias, o card deve mudar junto.
          </p>
        </section>
        <section class="dashboard-help__card dashboard-help__card--full">
          <h4>O que cada nível representa</h4>
          <ul class="dashboard-help__list">
            <li><strong>Raiz</strong>: a vida como um todo, no organograma.</li>
            <li><strong>Troncos / cardinais</strong>: as grandes áreas da vida, como identidade, saúde, família e trabalho.</li>
            <li><strong>Nós / galhos</strong>: subáreas que organizam melhor cada cardinal.</li>
            <li><strong>Folhas</strong>: os cards que você incrementa ou decrementa com + e -, no dashboard.</li>
          </ul>
          <ul class="dashboard-help__list">
            <li><strong>Identidade</strong>: valores, direção, propósito e o tipo de pessoa que você quer ser.</li>
            <li><strong>Saúde mental</strong>: humor, estresse, equilíbrio emocional e clareza interna.</li>
            <li><strong>Saúde física</strong>: sono, energia, movimento, condicionamento e sinais do corpo.</li>
            <li><strong>Família</strong>: vínculos, convivência, cuidado, filhos e organização doméstica.</li>
            <li><strong>Profissional</strong>: operação, crescimento, equipe, dinheiro e pressão do trabalho.</li>
          </ul>
          <p class="panel-note">
            Neste contexto, “folhas” não são o organograma em si. São os cards de acompanhamento que você ajusta manualmente.
          </p>
        </section>
      </div>
    </div>
  </div>
`;

const renderLeafHelpModal = ({ leaf, cardinalName = "", nodeName = "" }) => {
  if (!leaf) return "";

  const leafName = getLeafDisplayName(leaf) || leaf.name || "Folha";
  const leafExample = getLeafHelpExample(leafName);

  return `
    <div class="modal modal--dashboard-help is-open" role="dialog" aria-modal="true" aria-labelledby="dashboard-help-title">
      <div class="modal__backdrop" data-action="close-leaf-help"></div>
      <div class="modal__panel modal__panel--dashboard-help">
        <header class="modal__header">
          <div>
            <p class="eyebrow">Ajuda rápida</p>
            <h3 id="dashboard-help-title">${leafName}</h3>
          </div>
          <button type="button" class="icon-button" data-action="close-leaf-help" aria-label="Fechar ajuda">x</button>
        </header>
        <div class="dashboard-help">
          <section class="dashboard-help__card">
            <h4>O que esta folha representa</h4>
            <p>
              Esta folha é a leitura prática de <strong>${leafName}</strong> dentro de <strong>${nodeName || "Sem nó"}</strong> e da cardinal <strong>${cardinalName || "Sem cardinal"}</strong>.
            </p>
            <p>
              Pense nela como um termômetro do aspecto concreto que a palavra sugere no seu dia a dia, não como opinião ou julgamento.
            </p>
          </section>
          <section class="dashboard-help__card">
            <h4>Quando subir ou descer</h4>
            <p>
              <strong>Suba com +</strong> quando houver avanço real, mais constância, menos atrito ou mais presença do que a folha representa.
            </p>
            <p>
              <strong>Desça com -</strong> quando houver retrocesso, pausa, piora perceptível, excesso ou perda de controle.
            </p>
          </section>
          <section class="dashboard-help__card dashboard-help__card--full">
            <h4>Como ler esta palavra</h4>
            <p>
              Se o nome for amplo, leia a folha como a versão concreta da palavra. Exemplo útil para esta folha: <strong>${leafExample}</strong>.
            </p>
            <p class="panel-note">
              O número deve acompanhar a realidade recente. Se a prática mudou, o valor também deve mudar.
            </p>
          </section>
        </div>
      </div>
    </div>
  `;
};

export const renderMoodCheckModal = ({
  moodEmoji,
  moodLabel,
  cardinals,
  moodCheckStep = "confirm",
  selectedCardinalId = "",
}) => {
  const sortedCardinals = [...cardinals].sort((left, right) => left.value - right.value);

  return `
    <div class="modal modal--mood is-open" role="dialog" aria-modal="true" aria-labelledby="mood-check-title">
      <div class="modal__backdrop" data-action="close-mood-check"></div>
      <div class="modal__panel modal__panel--mood">
        <header class="modal__header">
          <div>
            <p class="eyebrow">Leitura emocional</p>
            <h3 id="mood-check-title">
              ${moodCheckStep === "cardinal" ? "Qual área da vida foi depreciada?" : "Esse emoji representa seu estado emocional atual?"}
            </h3>
          </div>
          <button type="button" class="icon-button" data-action="close-mood-check" aria-label="Fechar checagem emocional">x</button>
        </header>
        <div class="mood-check">
          ${
            moodCheckStep === "cardinal"
              ? `
                <div class="mood-check__intro">
                  <div class="mood-check__emoji">${moodEmoji}</div>
                  <div>
                    <p class="mood-check__copy">
                      Se a leitura do app não bateu com o que você sente, escolha a área mais afetada para abrir as folhas certas.
                    </p>
                    <p class="panel-note">As variáveis base dessa cardinal serão abertas para ajuste imediato.</p>
                  </div>
                </div>
                <div class="mood-check__cardinals">
                  ${sortedCardinals
                    .map(
                      (cardinal) => `
                        <button
                          type="button"
                          class="mood-check__cardinal ${selectedCardinalId === cardinal.id ? "is-active" : ""}"
                          data-action="resolve-mood-check-cardinal"
                          data-cardinal-id="${cardinal.id}"
                        >
                          <strong>${cardinal.name}</strong>
                          <span>${cardinal.value} pontos</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
                <div class="card__footer card__footer--split">
                  <button type="button" class="button button--ghost" data-action="back-mood-check">Voltar</button>
                  <button type="button" class="button button--soft" data-action="close-mood-check">Fechar</button>
                </div>
              `
              : `
                <div class="mood-check__intro">
                  <div class="mood-check__emoji">${moodEmoji}</div>
                  <div>
                    <p class="mood-check__copy">
                      O app está lendo seu estado como <strong>${moodLabel}</strong>. Isso confere com o que você sente agora?
                    </p>
                    <p class="panel-note">Se não conferir, vamos direto para a área da vida que precisa ser aberta e ajustada.</p>
                  </div>
                </div>
                <div class="card__footer card__footer--split">
                  <button type="button" class="button button--soft" data-action="resolve-mood-check-yes">Sim, continua</button>
                  <button type="button" class="button button--ghost" data-action="resolve-mood-check-no">Não, ajustar áreas</button>
                </div>
              `
          }
        </div>
      </div>
    </div>
  `;
};

export const createDashboardMarkup = (state) => {
  const summary = buildReviewSummary(state);
  const openNodeKeys = new Set(state.ui?.openNodeKeys || []);
  const activeLeaves = getActiveLeaves(state.baseVariables);
  const showHiddenLeaves = Boolean(state.ui?.showHiddenLeaves);
  const weeklyReviewCollapsed = Boolean(state.panelStates?.weeklyReviewCollapsed);
  const nextStepCollapsed = Boolean(state.panelStates?.nextStepCollapsed);
  const weeklyReviewScoreDraft = state.drafts?.weeklyReviewScore;
  const weeklyReviewNoteDraft = state.drafts?.weeklyReviewNote;
  const nextStepTextDraft = state.drafts?.nextStepText;
  const weeklyReviewScore =
    weeklyReviewScoreDraft !== null && weeklyReviewScoreDraft !== undefined
      ? Number(weeklyReviewScoreDraft)
      : Number(state.weeklyReview.moodValue ?? 0);
  const weeklyReviewNote =
    weeklyReviewNoteDraft !== null && weeklyReviewNoteDraft !== undefined
      ? weeklyReviewNoteDraft
      : state.weeklyReview.note || "";
  const nextStepText =
    nextStepTextDraft !== null && nextStepTextDraft !== undefined ? nextStepTextDraft : state.nextStep.text || "";
  const radarItems = state.cardinals.map((item) => ({
    ...item,
    value: item.value,
  }));
  const organogramSnapshot = state.organogram?.latest || null;
  const nextStep = state.nextStep || {};

  const filteredLeaves = findLeaves(
    activeLeaves.map((leaf) => ({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
    })),
    state.leafSearchQuery
  );

  const currentNextLeafRaw =
    activeLeaves.find((leaf) => leaf.id === state.nextStep.leafId) || activeLeaves[0];
  const currentNextLeaf = currentNextLeafRaw
    ? {
        ...currentNextLeafRaw,
        cardinalName: state.cardinals.find((item) => item.id === currentNextLeafRaw.cardinalId)?.name || "",
        horizonLabel: horizonLabel(currentNextLeafRaw.horizonDays),
      }
    : null;
  const weakestCardinal = state.cardinals.reduce((lowest, cardinal) => {
    if (!lowest) return cardinal;
    return cardinal.value < lowest.value ? cardinal : lowest;
  }, null);
  const currentNextLeafContext = currentNextLeaf
    ? {
        ...currentNextLeaf,
        nextStep,
      }
    : null;
  const dashboardHelpLeafId = state.localState?.dashboardHelpLeafId || "";
  const dashboardHelpLeaf = dashboardHelpLeafId
    ? activeLeaves.find((item) => item.id === dashboardHelpLeafId) || null
    : null;
  const motivationalMessage = currentNextLeafContext
    ? pickDashboardPhrase({
        phrases: state.ui?.dashboardPhrases,
        leafName: getLeafDisplayName(currentNextLeafContext),
        currentValue: currentNextLeafContext.currentValue,
        dateStamp: getLocalDateStamp(),
      })
    : "";

  const changedLeaves = activeLeaves
    .filter((leaf) => leaf.currentValue !== leaf.startValue)
    .map((leaf) => ({
      ...leaf,
      cardinalName: state.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
      previousValue: leaf.previousValue ?? leaf.currentValue,
      progress: progressBetween(leaf.startValue, leaf.currentValue, leaf.targetValue),
    }));
  const archiveNodeGroups = (() => {
    const nodes = new Map();

    changedLeaves.forEach((leaf) => {
      const nodeKey = `${leaf.cardinalId}::${leaf.nodeName || "Sem grupo"}`;
      if (!nodes.has(nodeKey)) {
        nodes.set(nodeKey, {
          key: nodeKey,
          cardinalId: leaf.cardinalId,
          cardinalName: leaf.cardinalName,
          nodeName: leaf.nodeName || "Sem grupo",
          nodeId: leaf.nodeId || nodeKey,
          leaves: [],
        });
      }
      nodes.get(nodeKey).leaves.push(leaf);
    });

    return [...nodes.values()];
  })();

  const avgCardinal = average(state.cardinals.map((item) => item.value));
  const moodEmoji = summary.mood.emoji;
  const buildNodeGroups = (cardinalId) => {
    const nodes = new Map();
    activeLeaves
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
      nodeId: leaves[0]?.nodeId || nodeName,
      key: `${cardinalId}::${nodeName}`,
      isOpen: openNodeKeys.has(`${cardinalId}::${nodeName}`),
      leaves: leaves.filter((leaf) => showHiddenLeaves || !leaf.hidden),
      totalLeaves: leaves.length,
      hiddenLeaves: leaves.filter((leaf) => leaf.hidden).length,
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
            <span data-summary="sync-message">${state.ui?.syncMessage || "Alterações salvas localmente"}</span>
          </div>
          <button
            type="button"
            class="button button--soft"
            data-action="save-firestore"
            ${state.ui?.saving ? "disabled" : ""}
          >
            ${state.ui?.saving ? "Salvando..." : "Salvar no Firestore"}
          </button>
          ${state.ui?.showFirestoreSync ? `
            <button type="button" class="button button--ghost" data-action="sync-firestore" ${state.ui?.saving ? "disabled" : ""}>
              Sincronizar no Firestore
            </button>
          ` : ""}
          <button type="button" class="button button--ghost" data-action="sign-out">Sair</button>
        </div>
      </header>

      <section class="card dashboard-card dashboard-card--wide session-card" data-dashboard-section="session-current">
        <header class="card__header">
          <div>
            <p class="eyebrow">Card 1</p>
            <h3>Sessão atual</h3>
          </div>
          <div class="session-card__status">
            <button
              type="button"
              class="session-card__emoji session-card__emoji-button"
              data-action="open-mood-check"
              aria-haspopup="dialog"
              aria-label="Revisar se esse estado emocional está correto"
            >
              ${moodEmoji}
            </button>
            <div>
              <strong data-summary="session-mood">${summary.mood.label}</strong>
              <small>Estado emocional atual</small>
            </div>
          </div>
        </header>
        <div class="overview-grid session-card__grid">
          <div class="overview-panel session-card__panel">
            <div class="session-card__intro">
              <div>
                <p class="eyebrow">Leitura rápida</p>
                <h2>O que importa agora, sem repetir informação demais.</h2>
                <p class="hero__copy">
                  O resumo principal concentra apenas os sinais úteis para decisão rápida: estado emocional,
                  média das cardinais e volume de mudanças recentes.
                </p>
              </div>
            </div>
            <div class="hero__stats session-card__stats">
              <div class="stat">
                <span class="stat__label">Média das cardinais</span>
                <strong data-summary="session-average-cardinal">${formatPercent(avgCardinal)}</strong>
              </div>
              <div class="stat">
                <span class="stat__label">Folhas alteradas</span>
                <strong data-summary="session-changed-leaves">${changedLeaves.length}</strong>
              </div>
              <div class="stat">
                <span class="stat__label">Cardinal em foco</span>
                <strong data-summary="session-focus-cardinal">${weakestCardinal ? `${weakestCardinal.name} (${formatPercent(weakestCardinal.value)})` : "Sem cardinais"}</strong>
              </div>
            </div>
            <div class="session-card__secondary">
              <p class="session-card__secondary-label">Contexto secundário</p>
              <div class="session-card__meta session-card__meta--compact">
                <div class="session-card__meta-item">
                  <span>Atualizado em</span>
                  <strong data-summary="session-updated-at">${formatDateTime(state.updatedAt)}</strong>
                </div>
                <div class="session-card__meta-item">
                  <span>Sincronização</span>
                  <strong data-summary="session-last-saved-at">${state.ui?.lastSavedAt ? formatDateTime(state.ui.lastSavedAt) : "Ainda não enviado"}</strong>
                </div>
              </div>
            </div>
          </div>
          <div class="overview-panel overview-panel--chart session-card__chart" data-dashboard-section="overview-chart">
            <p class="overview-panel__title">Radar da sessão</p>
            ${renderRadarChart(radarItems)}
          </div>
        </div>
      </section>

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
                  <span class="chip chip--filled" style="--chip-color:${cardinal.color}">${activeLeaves.filter((leaf) => leaf.cardinalId === cardinal.id).length} folhas</span>
                </header>
                <div class="node-stack">
                  ${nodeGroups
                    .map(
                      (node) => `
                        <section class="node-card">
                          <div class="node-card__header-row">
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
                            </button>
                            <div class="node-card__actions">
                              <button
                                type="button"
                                class="icon-button icon-button--small"
                                data-action="create-leaf"
                                data-cardinal-id="${cardinal.id}"
                                data-node-id="${node.nodeId}"
                                data-node-name="${node.nodeName}"
                                aria-label="Criar folha em ${node.nodeName}"
                              >
                                +
                              </button>
                              <span class="chip">${node.totalLeaves} folhas</span>
                              ${node.hiddenLeaves > 0 && !showHiddenLeaves ? `<span class="chip chip--ghost">${node.hiddenLeaves} ocultas</span>` : ""}
                            </div>
                          </div>
                          <div class="leaf-stack ${node.isOpen ? "is-open" : ""}">
                            ${node.leaves
                              .map(
                                (leaf) => `
                                  <div class="leaf-item ${leafToneClass(leaf.currentValue)} ${horizonToneClass(leaf.horizonDays)} ${leaf.hidden ? "leaf-item--hidden" : ""}" data-leaf-id="${leaf.id}">
                                    <div class="leaf-item__heading">
                                      <button
                                        type="button"
                                        class="icon-button icon-button--small"
                                        data-action="rename-leaf"
                                        data-leaf-id="${leaf.id}"
                                        aria-label="Renomear ${getLeafDisplayName(leaf)}"
                                      >
                                        ✎
                                      </button>
                                      <strong>${leaf.name}</strong>
                                      <button
                                        type="button"
                                        class="icon-button icon-button--small icon-button--help leaf-item__help"
                                        data-action="open-leaf-help"
                                        data-leaf-id="${leaf.id}"
                                        aria-label="Abrir ajuda sobre ${getLeafDisplayName(leaf)}"
                                        title="Ajuda"
                                      >
                                        i
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      class="icon-button icon-button--small"
                                      data-action="toggle-leaf-menu"
                                      data-leaf-id="${leaf.id}"
                                      aria-label="Abrir ações de ${getLeafDisplayName(leaf)}"
                                    >
                                      ⚙
                                    </button>
                                    ${state.ui?.openLeafMenuId === leaf.id ? `
                                      <div class="leaf-item__menu">
                                        <button type="button" class="button button--ghost button--tiny" data-action="toggle-leaf-hidden" data-leaf-id="${leaf.id}">
                                          ${leaf.hidden ? "Mostrar" : "Ocultar"}
                                        </button>
                                        <button type="button" class="button button--ghost button--tiny button--danger" data-action="delete-leaf" data-leaf-id="${leaf.id}">
                                          Excluir
                                        </button>
                                      </div>
                                    ` : ""}
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
                            ${node.leaves.length === 0 ? `<p class="empty-state empty-state--compact">Nenhuma folha visível neste nó.</p>` : ""}
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

        <article class="card dashboard-card dashboard-card--wide ${weeklyReviewCollapsed ? "card--collapsed" : ""}" data-dashboard-section="weekly-review">
          <header class="card__header">
            <div>
              <p class="eyebrow">Card 8</p>
              <h3>Como foi o nosso desenvolvimento desde que definimos este passo?</h3>
            </div>
            ${weeklyReviewCollapsed ? `<button type="button" class="button button--ghost" data-action="toggle-weekly-review-card">Editar</button>` : ""}
          </header>
          <div class="card__body">
            <div class="review-panel">
              ${renderNextStepLeafContext(currentNextLeafContext, nextStep)}
              <p class="review-panel__score">
                Resultado atual:
                <strong data-weekly-review-score-current>
                  ${weeklyReviewScore > 0 ? "+" : ""}
                  ${weeklyReviewScore}
                </strong>
                <span data-weekly-review-score-label>${statusLabels[weeklyReviewScore] || "Neutro"}</span>
              </p>
              ${renderStatusBar(weeklyReviewScore)}
              <label class="field">
                <span>Observações rápidas</span>
                <textarea rows="3" data-field="weekly-review-note" placeholder="O que avançou, travou ou ficou mais claro?">${weeklyReviewNote}</textarea>
              </label>
              <p class="panel-note">O texto acima fica como rascunho até clicar em Feito.</p>
            </div>
            <footer class="card__footer">
              <button type="button" class="button button--soft" data-action="commit-weekly-review">Feito</button>
            </footer>
          </div>
        </article>

        <article class="card dashboard-card dashboard-card--wide ${nextStepCollapsed ? "card--collapsed" : ""}" data-dashboard-section="next-step">
          <header class="card__header">
            <div>
              <p class="eyebrow">Card 9</p>
              <h3>Qual é o próximo passo concreto que melhoraria minha vida nos próximos 7 dias?</h3>
            </div>
            ${nextStepCollapsed ? `<button type="button" class="button button--ghost" data-action="toggle-next-step-card">Editar próximo passo concreto</button>` : ""}
          </header>
          <div class="card__body">
            <div class="next-step-panel">
              ${renderNextStepLeafContext(currentNextLeafContext, nextStep)}
              <label class="field">
                <span>Frase do próximo passo</span>
                <textarea rows="3" data-field="next-step-text" placeholder="Escreva a ação concreta...">${nextStepText}</textarea>
              </label>
              <p class="panel-note">A frase acima fica em rascunho até clicar em Feito.</p>
              <div class="card__footer card__footer--split">
                <button type="button" class="button button--soft" data-action="open-modal">Procurar folhas</button>
                <button type="button" class="button button--soft" data-action="commit-next-step">Feito</button>
              </div>
            </div>
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
                <span class="chip chip--ghost">${changedLeaves.length} folhas em ${archiveNodeGroups.length} nós</span>
              </header>
              <div class="archive-panel">
                ${changedLeaves.length
                  ? `
                    <div class="archive-node-stack">
                      ${archiveNodeGroups
                        .map((node) => {
                          const nodeKey = node.key;
                          const isOpen = Boolean(state.ui?.openArchiveNodeKeys?.includes(nodeKey));
                          return `
                            <section class="node-card archive-node-card">
                              <div class="node-card__header-row">
                                <button
                                  type="button"
                                  class="node-card__header ${isOpen ? "is-open" : ""}"
                                  data-action="toggle-archive-node"
                                  data-node-key="${nodeKey}"
                                  aria-expanded="${isOpen ? "true" : "false"}"
                                >
                                  <div>
                                    <h4>${node.nodeName}</h4>
                                    <small>${node.cardinalName}</small>
                                  </div>
                                </button>
                                <div class="node-card__actions">
                                  <span class="chip">${node.leaves.length} folhas</span>
                                </div>
                              </div>
                              <div class="leaf-stack ${isOpen ? "is-open" : ""}">
                                ${node.leaves
                                  .map(
                                    (leaf) => `
                                      <div class="archive-row archive-row--compact">
                                        <div>
                                          <strong>${leaf.name}</strong>
                                          <small>${leaf.progress.toFixed(0)}% concluído</small>
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
                            </section>
                          `;
                        })
                        .join("")}
                    </div>
                  `
                  : `<p class="empty-state">Nenhuma folha foi alterada ainda.</p>`}
              </div>
            </article>

            <article class="card dashboard-card dashboard-card--wide" data-dashboard-section="organogram">
              <header class="card__header">
                <div>
                  <p class="eyebrow">Card 11</p>
                  <h3>Organograma horizontal</h3>
                </div>
                <span class="chip chip--filled">
                  ${organogramSnapshot ? `Gerado em ${formatDateTime(organogramSnapshot.generatedAt)}` : "Ainda não gerado"}
                </span>
              </header>
              <div class="organogram-card">
                <div class="organogram-card__toolbar">
                  <button type="button" class="button button--soft" data-action="generate-organogram">
                    ${organogramSnapshot ? "Regenerar organograma" : "Gerar organograma"}
                  </button>
                  ${organogramSnapshot ? `
                    <button type="button" class="button button--ghost" data-action="export-organogram">
                      Baixar PNG
                    </button>
                    <button type="button" class="button button--ghost" data-action="share-organogram">
                      Compartilhar
                    </button>
                  ` : ""}
                </div>
                <div class="organogram-stage ${organogramSnapshot ? "is-ready" : ""}">
                  ${organogramSnapshot
                    ? renderOrganogramSvg(organogramSnapshot)
                    : `
                      <div class="organogram-empty">
                        <p class="eyebrow">Pré-visualização bloqueada</p>
                        <h4>Gere o organograma para criar a versão mais recente.</h4>
                        <p>O arquivo fica salvo no aparelho e sincroniza com o Firebase junto com o workspace atual.</p>
                      </div>
                    `}
                </div>
                <div class="organogram-card__meta">
                  <span data-summary="organogram-generated-at">
                    ${organogramSnapshot ? formatDateTime(organogramSnapshot.generatedAt) : "Nunca gerado"}
                  </span>
                  <span data-summary="organogram-leaf-count">
                    ${organogramSnapshot ? organogramSnapshot.metrics.leafCount : 0} folhas
                  </span>
                  <span data-summary="organogram-node-count">
                    ${organogramSnapshot ? organogramSnapshot.metrics.nodeCount : 0} galhos
                  </span>
                </div>
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
        <button
          type="button"
          class="button button--ghost"
          data-action="toggle-hidden-leaves"
        >
          ${state.showHiddenLeaves ? "Ocultar folhas" : "Mostrar folhas"}
        </button>
      </footer>

      <button
        type="button"
        class="scroll-top-fab"
        data-action="scroll-top"
        aria-label="Voltar ao topo"
        aria-hidden="true"
      >
        ↑ Topo
      </button>
    </div>

    ${state.localState?.dashboardHelpOpen ? renderLeafHelpModal({
      leaf: dashboardHelpLeaf,
      cardinalName: state.cardinals.find((item) => item.id === dashboardHelpLeaf?.cardinalId)?.name || "",
      nodeName: dashboardHelpLeaf?.nodeName || "",
    }) : ""}
    ${state.modalOpen ? renderLeafModal({ leaves: filteredLeaves, query: state.leafSearchQuery, selectedLeafId: state.nextStep.leafId }) : ""}
    ${state.ui?.nextStepReminderOpen ? renderNextStepReminderModal({
      currentNextLeaf: currentNextLeafContext,
      nextStep,
      weeklyReviewScore,
      motivationalMessage,
      syncMessage: state.ui?.syncMessage,
    }) : ""}
  `;
};

