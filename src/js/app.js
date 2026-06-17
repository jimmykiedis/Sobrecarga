import {
  createDefaultState,
  normalizeState,
  deriveCardinalValues,
  mergeStateWithSeed,
  updateCardinalValue,
  updateLeafValue,
  updateLeafHorizon,
  setWeeklyReviewScore,
  setWeeklyReviewNote,
  selectNextStep,
  setLeafSearchQuery,
  toggleModal,
  toggleArchive,
  rolloverDailySnapshot,
} from "./services/variableService.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  isFirebaseReady,
  saveUserWorkspace,
} from "./firebase/firebase.js";
import { createDashboardMarkup } from "./ui/dashboard.js";
import { renderLeafResults } from "./ui/adviceModal.js";
import { getMoodFromAverageValue } from "./services/moodService.js";
import { findLeaves } from "./services/adviceService.js";
import { average, formatPercent } from "./utils/calculations.js";
import { formatDateTime, horizonIndexToValue, horizonLabel, horizonValueToIndex } from "./utils/dates.js";
import { buildReviewSummary } from "./services/reviewService.js";

const STORAGE_PREFIX = "sobrecarga-state:";
const app = document.getElementById("app");
const SCROLL_TOP_REVEAL_OFFSET = 160;

const state = {
  user: null,
  authReady: false,
  loading: false,
  saving: false,
  error: "",
  formError: "",
  syncMessage: "Aguardando login",
  dirty: false,
  lastSavedAt: null,
  localState: createDefaultState(),
};

let dashboardEventsBound = false;
let leafSearchTimer = null;
let scrollTopSyncRaf = null;
let scrollTopBehaviorBound = false;
const expandedNodeKeys = new Set();

const cloneState = (value) => JSON.parse(JSON.stringify(value));

const storageKey = (user) => `${STORAGE_PREFIX}${user.uid || user.email || "guest"}`;

const loadSavedState = (user) => {
  try {
    const saved = localStorage.getItem(storageKey(user));
    if (!saved) return createDefaultState();
    return rolloverDailySnapshot(mergeStateWithSeed(JSON.parse(saved)));
  } catch {
    return createDefaultState();
  }
};

const saveState = () => {
  if (!state.user) return;
  state.localState = rolloverDailySnapshot(state.localState);
  localStorage.setItem(storageKey(state.user), JSON.stringify(state.localState));
};

const syncDerivedState = () => {
  const derivedCardinals = deriveCardinalValues(state.localState.baseVariables);
  const values = derivedCardinals.map((item) => item.value);
  const mood = getMoodFromAverageValue(values);
  state.localState = {
    ...state.localState,
    cardinals: derivedCardinals,
    mood,
    averageCardinalValue: average(values),
    updatedAt: new Date().toISOString(),
  };
};

const renderLogin = () => {
  app.innerHTML = `
    <main class="auth-screen">
      <section class="auth-card card">
        <div class="auth-card__intro">
          <p class="eyebrow">Sobrecarga</p>
          <h1>Login com Firebase</h1>
          <p>
            Entre com seu e-mail e senha para abrir o menu principal da PWA.
          </p>
          <div class="auth-note">
            <span>${isFirebaseReady() ? "Firebase pronto" : "Firebase não configurado"}</span>
            <span>${formatDateTime(new Date())}</span>
          </div>
        </div>
        <form class="auth-form" data-form="login">
          <label class="field">
            <span>E-mail</span>
            <input type="email" name="email" placeholder="voce@exemplo.com" autocomplete="email" required />
          </label>
          <label class="field">
            <span>Senha</span>
            <input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required />
          </label>
          ${state.formError ? `<p class="form-message form-message--error">${state.formError}</p>` : ""}
          ${state.error ? `<p class="form-message form-message--error">${state.error}</p>` : ""}
          <button type="submit" class="button button--primary" ${state.loading ? "disabled" : ""}>
            ${state.loading ? "Entrando..." : "Entrar"}
          </button>
          <p class="auth-hint">A primeira autenticação acontece no Firebase Authentication.</p>
        </form>
      </section>
      <div class="auth-visual">
        <div class="orb orb--one"></div>
        <div class="orb orb--two"></div>
        <div class="auth-visual__card card">
          <p class="eyebrow">PWA</p>
          <h2>Clareza visual para revisar folhas, cardinais e o próximo passo.</h2>
          <p>Feita para uso semanal, mas pronta para visitas diárias.</p>
        </div>
      </div>
    </main>
  `;

  const form = app.querySelector('[data-form="login"]');
  form.addEventListener("submit", handleLoginSubmit);
};

const renderDashboard = () => {
  app.innerHTML = buildDashboardMarkup();
  bindDashboardEvents();
  requestAnimationFrame(() => {
    const chart = app.querySelector(".radar-chart");
    if (chart) {
      chart.classList.add("is-ready");
    }
    syncScrollTopButtonVisibility();
  });
};

const buildDashboardMarkup = () =>
  createDashboardMarkup({
    ...state.localState,
    ui: {
      dirty: state.dirty,
      syncMessage: state.syncMessage,
      saving: state.saving,
      lastSavedAt: state.lastSavedAt,
      openNodeKeys: [...expandedNodeKeys],
    },
  });

const patchDashboardSections = (selectors) => {
  if (!state.user || state.loading) return;

  const template = document.createElement("template");
  template.innerHTML = buildDashboardMarkup();

  selectors.forEach((selector) => {
    const currentSection = app.querySelector(selector);
    const nextSection = template.content.querySelector(selector);
    if (currentSection && nextSection) {
      currentSection.replaceWith(nextSection);
    }
  });

  requestAnimationFrame(() => {
    const chart = app.querySelector(".radar-chart");
    if (chart) {
      chart.classList.add("is-ready");
    }
    syncScrollTopButtonVisibility();
  });
};

const getScrollTopButton = () => app.querySelector('[data-action="scroll-top"]');

const syncScrollTopButtonVisibility = () => {
  const button = getScrollTopButton();
  if (!button) return;

  const scrollRoot = document.scrollingElement || document.documentElement;
  const currentScrollTop = scrollRoot.scrollTop ?? window.scrollY;
  const maxScrollableDistance = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
  const shouldShow = maxScrollableDistance > 0 && currentScrollTop >= maxScrollableDistance - SCROLL_TOP_REVEAL_OFFSET;

  button.classList.toggle("is-visible", shouldShow);
  button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
};

const scheduleScrollTopButtonVisibilitySync = () => {
  if (scrollTopSyncRaf) return;
  scrollTopSyncRaf = window.requestAnimationFrame(() => {
    scrollTopSyncRaf = null;
    syncScrollTopButtonVisibility();
  });
};

const bindScrollTopButtonBehavior = () => {
  if (scrollTopBehaviorBound) return;
  window.addEventListener("scroll", scheduleScrollTopButtonVisibilitySync, { passive: true });
  window.addEventListener("resize", scheduleScrollTopButtonVisibilitySync, { passive: true });
  scrollTopBehaviorBound = true;
};

const refreshSummaryBindings = () => {
  const summary = buildReviewSummary(state.localState);
  const currentNextLeaf =
    state.localState.baseVariables.find((leaf) => leaf.id === state.localState.nextStep.leafId) ||
    state.localState.baseVariables[0];

  const setText = (selector, value) => {
    const element = app.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  };

  const moodEmoji = summary.mood.emoji;
  setText('[data-summary="mood-emoji"]', moodEmoji);
  setText('[data-summary="mood-label"]', summary.mood.label);
  setText('[data-summary="sync-message"]', state.syncMessage || "Salvo localmente");
  setText('[data-summary="hero-average-cardinal"]', formatPercent(summary.averageCardinal));
  setText('[data-summary="hero-changed-leaves"]', String(summary.changedLeaves));
  setText('[data-summary="hero-updated-at"]', formatDateTime(state.localState.updatedAt));
  setText(
    '[data-summary="hero-last-saved-at"]',
    state.lastSavedAt ? formatDateTime(state.lastSavedAt) : "Ainda não enviado"
  );
  setText('[data-summary="overview-mood"]', summary.mood.label);
  setText('[data-summary="overview-average-cardinal"]', summary.averageCardinal.toFixed(1));
  setText('[data-summary="overview-progress-average"]', `${summary.progressAverage.toFixed(1)}%`);
  setText('[data-summary="overview-next-step"]', currentNextLeaf?.name || "Definir");
};

const refreshRadarChart = () => {
  const chart = app.querySelector('[data-dashboard-section="overview-chart"]');
  if (!chart) return;
  chart.innerHTML = createDashboardMarkup({
    ...state.localState,
    ui: {
      dirty: state.dirty,
      syncMessage: state.syncMessage,
      saving: state.saving,
      lastSavedAt: state.lastSavedAt,
    },
  })
    .match(/<div class="overview-panel overview-panel--chart" data-dashboard-section="overview-chart">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/)?.[1] || chart.innerHTML;
};

const refreshCardinalRow = (cardinalId) => {
  const cardinal = state.localState.cardinals.find((item) => item.id === cardinalId);
  const value = app.querySelector(`[data-cardinal-value="${cardinalId}"]`);
  if (value && cardinal) {
    value.textContent = String(cardinal.value);
  }
};

const refreshLeafItem = (leafId) => {
  const leaf = state.localState.baseVariables.find((item) => item.id === leafId);
  const element = app.querySelector(`[data-leaf-id="${leafId}"]`);
  if (!element || !leaf) return;

  element.classList.remove("tone-excellent", "tone-healthy", "tone-steady", "tone-attention", "tone-critical");
  element.classList.add(leafToneClass(leaf.currentValue));

  const value = element.querySelector(`[data-leaf-value="${leafId}"]`);
  if (value) value.textContent = String(leaf.currentValue);

  const horizon = element.querySelector(`[data-leaf-horizon-label="${leafId}"]`);
  if (horizon) horizon.textContent = horizonLabel(leaf.horizonDays);

  const input = element.querySelector(`[data-leaf-horizon-input="${leafId}"]`);
  if (input) {
    input.value = String(horizonValueToIndex(leaf.horizonDays));
  }
};

const refreshLeafModalResults = () => {
  const modal = app.querySelector(".modal.is-open");
  if (!modal) return;

  const results = modal.querySelector(".modal__results");
  if (!results) return;

  const leaves = findLeaves(
    state.localState.baseVariables.map((leaf) => ({
      ...leaf,
      cardinalName: state.localState.cardinals.find((item) => item.id === leaf.cardinalId)?.name || "",
      horizonLabel: horizonLabel(leaf.horizonDays),
    })),
    state.localState.leafSearchQuery
  );

  results.innerHTML = renderLeafResults({
    leaves,
    query: state.localState.leafSearchQuery,
    selectedLeafId: state.localState.nextStep.leafId,
  });
};

const setLocalStatePartial = (updater, partialSelectors) => {
  state.localState = rolloverDailySnapshot(normalizeState(updater(cloneState(state.localState))));
  syncDerivedState();
  state.dirty = true;
  state.syncMessage = "AlteraÃ§Ãµes salvas localmente";
  refreshSummaryBindings();
  patchDashboardSections(partialSelectors);
  saveState();
};

const renderLoading = () => {
  app.innerHTML = `
    <main class="auth-screen">
      <section class="auth-card card">
        <p class="eyebrow">Sobrecarga</p>
        <h1>Carregando seus dados</h1>
        <p>Estamos abrindo o workspace do Firestore e preparando suas variáveis.</p>
      </section>
    </main>
  `;
};

const render = () => {
  if (!state.user) {
    renderLogin();
    return;
  }
  if (state.loading) {
    renderLoading();
    return;
  }
  syncDerivedState();
  renderDashboard();
  saveState();
};

const setLocalState = (updater) => {
  state.localState = rolloverDailySnapshot(normalizeState(updater(cloneState(state.localState))));
  syncDerivedState();
  state.dirty = true;
  state.syncMessage = "Alterações salvas localmente";
  renderDashboard();
  saveState();
};

const handleLoginSubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  state.loading = true;
  state.formError = "";
  state.error = "";
  renderLogin();

  try {
    await signInWithEmailAndPassword(email, password);
  } catch (error) {
    state.formError = error?.message || "Não foi possível entrar.";
    state.loading = false;
    renderLogin();
  }
};

const handleSignOut = async () => {
  await signOut();
};

const handleManualFirestoreSave = async () => {
  if (!state.user || state.saving) return;

  state.saving = true;
  state.syncMessage = "Enviando para o Firestore...";
  renderDashboard();

  try {
    await saveUserWorkspace(state.user.uid, state.localState);
    state.lastSavedAt = new Date().toISOString();
    state.dirty = false;
    state.syncMessage = "Salvo no Firestore";
  } catch (error) {
    state.syncMessage = error?.message || "Falha ao salvar no Firestore";
  } finally {
    state.saving = false;
    renderDashboard();
  }
};

const handleScrollTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const bindDashboardEvents = () => {
  if (dashboardEventsBound) return;
  app.addEventListener("click", handleDashboardClick);
  app.addEventListener("input", handleDashboardInput);
  app.addEventListener("pointerup", handleDashboardPointerUp);
  app.addEventListener("change", handleDashboardChange);
  app.addEventListener("keydown", handleDashboardKeydown);
  dashboardEventsBound = true;
};

const unbindDashboardEvents = () => {
  if (!dashboardEventsBound) return;
  app.removeEventListener("click", handleDashboardClick);
  app.removeEventListener("input", handleDashboardInput);
  app.removeEventListener("pointerup", handleDashboardPointerUp);
  app.removeEventListener("change", handleDashboardChange);
  app.removeEventListener("keydown", handleDashboardKeydown);
  dashboardEventsBound = false;
};

const buildCardinalSelectors = (cardinalId) => [
  `[data-dashboard-section="cardinal-panel"][data-cardinal-id="${cardinalId}"]`,
  `[data-cardinal-value="${cardinalId}"]`,
  '[data-dashboard-section="overview-chart"]',
];

const buildLeafSelectors = (leafId, cardinalId) => [
  `[data-leaf-id="${leafId}"]`,
  `[data-cardinal-value="${cardinalId}"]`,
  '[data-dashboard-section="overview-chart"]',
];

const getNodeKey = (cardinalId, nodeName) => `${cardinalId}::${nodeName}`;

const collectNodeKeysForCardinal = (cardinalId) => {
  const keys = new Set();
  state.localState.baseVariables
    .filter((leaf) => leaf.cardinalId === cardinalId)
    .forEach((leaf) => {
      keys.add(getNodeKey(cardinalId, leaf.nodeName || "Sem grupo"));
    });
  return [...keys];
};

const openNodesForCardinal = (cardinalId) => {
  collectNodeKeysForCardinal(cardinalId).forEach((key) => expandedNodeKeys.add(key));
};

function handleDashboardClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "sign-out") {
    handleSignOut();
    return;
  }

  if (action === "save-firestore") {
    handleManualFirestoreSave();
    return;
  }

  if (action === "scroll-top") {
    handleScrollTop();
    return;
  }

  if (action === "cardinal-delta") {
    const delta = Number(target.dataset.delta);
    const cardinalId = target.dataset.cardinalId;
    openNodesForCardinal(cardinalId);
    setLocalStatePartial((current) => updateCardinalValue(current, cardinalId, delta), buildCardinalSelectors(cardinalId));
    return;
  }

  if (action === "leaf-delta") {
    const delta = Number(target.dataset.delta);
    const leafId = target.dataset.leafId;
    const leaf = state.localState.baseVariables.find((item) => item.id === leafId);
    if (!leaf) return;
    expandedNodeKeys.add(getNodeKey(leaf.cardinalId, leaf.nodeName || "Sem grupo"));
    setLocalStatePartial((current) => updateLeafValue(current, leafId, delta), buildLeafSelectors(leafId, leaf.cardinalId));
    return;
  }

  if (action === "set-weekly-score") {
    const value = Number(target.dataset.value);
    setLocalState((current) => setWeeklyReviewScore(current, value));
    return;
  }

  if (action === "open-modal") {
    setLocalState((current) => toggleModal(current, true));
    return;
  }

  if (action === "close-modal") {
    setLocalState((current) => toggleModal(current, false));
    return;
  }

  if (action === "select-leaf") {
    const leafId = target.dataset.leafId;
    const leaf = state.localState.baseVariables.find((item) => item.id === leafId);
    if (leaf) {
      setLocalState((current) => selectNextStep(current, leaf));
    }
    return;
  }

  if (action === "toggle-archive") {
    setLocalState((current) => toggleArchive(current));
  }

  if (action === "toggle-node") {
    const nodeKey = target.dataset.nodeKey;
    const cardinalId = target.dataset.cardinalId;
    if (!nodeKey || !cardinalId) return;
    if (expandedNodeKeys.has(nodeKey)) {
      expandedNodeKeys.delete(nodeKey);
    } else {
      expandedNodeKeys.add(nodeKey);
    }
    patchDashboardSections([`[data-dashboard-section="cardinal-panel"][data-cardinal-id="${cardinalId}"]`]);
  }
}

function handleDashboardInput(event) {
  const field = event.target.closest("[data-field]");
  if (!field) return;

  if (field.dataset.field === "leaf-search") {
    const query = field.value;
    state.localState = setLeafSearchQuery(cloneState(state.localState), query);
    clearTimeout(leafSearchTimer);
    refreshLeafModalResults();
    leafSearchTimer = setTimeout(() => {
      saveState();
    }, 120);
    return;
  }

  if (field.dataset.field === "weekly-review-score") {
    const value = Number(field.value);
    setLocalState((current) => ({
      ...current,
      weeklyReview: {
        ...current.weeklyReview,
        moodValue: value,
      },
    }));
    return;
  }
}

function commitLeafHorizon(field) {
  if (field.dataset.field !== "leaf-horizon") return;

  const leafId = field.dataset.leafId;
  const horizonDays = horizonIndexToValue(field.value);
  const currentLeaf = state.localState.baseVariables.find((item) => item.id === leafId);

  if (!currentLeaf || Number(currentLeaf.horizonDays) === horizonDays) {
    return;
  }

  setLocalStatePartial(
    (current) => updateLeafHorizon(current, leafId, horizonDays),
    buildLeafSelectors(leafId, currentLeaf.cardinalId)
  );
}

function handleDashboardPointerUp(event) {
  const field = event.target.closest("[data-field]");
  if (!field) return;
  commitLeafHorizon(field);
}

function handleDashboardChange(event) {
  const field = event.target.closest("[data-field]");
  if (!field) return;

  if (field.dataset.field === "weekly-review-note") {
    setLocalState((current) => setWeeklyReviewNote(current, field.value));
    return;
  }

  if (field.dataset.field === "next-step-text") {
    setLocalState((current) => ({
      ...current,
      nextStep: {
        ...current.nextStep,
        text: field.value,
      },
    }));
    return;
  }

  commitLeafHorizon(field);
}

function handleDashboardKeydown(event) {
  if (event.key !== "Escape") return;
  const modal = app.querySelector(".modal.is-open");
  if (modal) {
    setLocalState((current) => toggleModal(current, false));
  }
}

const setupAuthListener = async () => {
  try {
    await onAuthStateChanged((user) => {
      if (user) {
        expandedNodeKeys.clear();
        state.user = { uid: user.uid, email: user.email };
        state.loading = true;
        state.authReady = true;
        state.error = "";
        render();
        state.localState = loadSavedState(state.user);
        state.loading = false;
        state.dirty = false;
        state.syncMessage = "Workspace atualizado com a árvore atual";
        render();
        return;
      }

      state.user = null;
      state.authReady = true;
      state.loading = false;
      state.localState = createDefaultState();
      expandedNodeKeys.clear();
      clearTimeout(leafSearchTimer);
      leafSearchTimer = null;
      state.dirty = false;
      state.lastSavedAt = null;
      state.syncMessage = "Aguardando login";
      unbindDashboardEvents();
      render();
    });
  } catch (error) {
    state.error = error?.message || "Não foi possível conectar ao Firebase.";
    state.authReady = true;
    state.loading = false;
    render();
  }
};

window.addEventListener("storage", (event) => {
  if (!state.user) return;
  if (event.key !== storageKey(state.user) || !event.newValue) return;
  try {
    state.localState = rolloverDailySnapshot(
      normalizeState({ ...createDefaultState(), ...JSON.parse(event.newValue) })
    );
    renderDashboard();
  } catch {
    // Mantém o estado atual se o payload externo vier inválido.
  }
});

setupAuthListener();
bindScrollTopButtonBehavior();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA continua funcionando sem cache offline.
    });
  });
}
