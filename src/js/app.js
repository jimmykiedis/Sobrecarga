import {
  createDefaultState,
  normalizeState,
  deriveCardinalValues,
  mergeStateWithSeed,
  updateCardinalValue,
  updateLeafValue,
  updateLeafHorizon,
  setLeafCustomName,
  setWeeklyReviewScore,
  selectNextStep,
  setLeafSearchQuery,
  createLeafInNode,
  toggleLeafHidden,
  deleteLeaf,
  toggleShowHiddenLeaves,
  getActiveLeaves,
  getLeafDisplayName,
  toggleModal,
  toggleArchive,
  rolloverDailySnapshot,
} from "./services/variableService.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  isFirebaseReady,
  loadUserWorkspace,
  listenUserWorkspace,
  saveUserWorkspace,
} from "./firebase/firebase.js";
import { createDashboardMarkup } from "./ui/dashboard.js";
import {
  buildOrganogramSnapshot,
  downloadOrganogramSnapshot,
  shareOrganogramSnapshot,
} from "./ui/organogram.js";
import { statusLabels } from "./ui/moodPanel.js";
import { renderLeafResults } from "./ui/adviceModal.js";
import { getMoodFromAverageValue } from "./services/moodService.js";
import { findLeaves } from "./services/adviceService.js";
import { loadDashboardPhrases } from "./services/inspirationService.js";
import { average, formatPercent } from "./utils/calculations.js";
import {
  formatDateTime,
  getLocalDateStamp,
  getNextLocalFiveAmTimestamp,
  horizonIndexToValue,
  horizonLabel,
  horizonValueToIndex,
} from "./utils/dates.js";
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
  drafts: {
    weeklyReviewScore: null,
  },
  panelStates: {
    weeklyReviewCollapsed: false,
    nextStepCollapsed: false,
  },
  nextStepReminderOpen: false,
  dashboardPhrases: null,
  dashboardPhrasesLoaded: false,
};

let dashboardEventsBound = false;
let leafSearchTimer = null;
let scrollTopSyncRaf = null;
let scrollTopBehaviorBound = false;
let centeredOrganogramSnapshotId = null;
let dashboardOpenedAt = null;
let firestoreButtonRevealTimer = null;
let firestoreAutoSyncTimer = null;
let firestoreWorkspaceListener = null;
let workspaceRecoveryEventsBound = false;
let lastFirestoreAutoSyncSignature = "";
let openLeafMenuId = null;
let nextStepReminderTimer = null;
const expandedNodeKeys = new Set();

const cloneState = (value) => JSON.parse(JSON.stringify(value));

const ensureDashboardPhrasesLoaded = async () => {
  if (state.dashboardPhrasesLoaded) return;
  state.dashboardPhrasesLoaded = true;
  try {
    state.dashboardPhrases = await loadDashboardPhrases();
  } catch {
    state.dashboardPhrases = [];
  }
  if (state.user) {
    renderDashboard();
  }
};

const storageKey = (user) => `${STORAGE_PREFIX}${user.uid || user.email || "guest"}`;
const DEVICE_ID_STORAGE_KEY = "sobrecarga-device-id";

const getWorkspaceDeviceId = () => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `device-${Date.now()}`;
  }
};

const getWorkspaceActorId = () => state.user?.uid || state.user?.email || "anonymous";

const normalizeWorkspaceMeta = (meta = {}) => {
  const revision = Number(meta.revision);
  return {
    revision: Number.isFinite(revision) && revision > 0 ? Math.floor(revision) : 1,
    lastModifiedAt: String(meta.lastModifiedAt || ""),
    lastModifiedBy: String(meta.lastModifiedBy || ""),
    lastModifiedDeviceId: String(meta.lastModifiedDeviceId || ""),
  };
};

const bumpWorkspaceMeta = (workspace) => {
  const currentMeta = normalizeWorkspaceMeta(workspace?.workspaceMeta);
  return {
    ...workspace,
    workspaceMeta: {
      revision: currentMeta.revision + 1,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: getWorkspaceActorId(),
      lastModifiedDeviceId: getWorkspaceDeviceId(),
    },
  };
};

const readSavedState = (user) => {
  try {
    const saved = localStorage.getItem(storageKey(user));
    if (!saved) return null;
    return rolloverDailySnapshot(mergeStateWithSeed(JSON.parse(saved)));
  } catch {
    return null;
  }
};

const saveState = () => {
  if (!state.user) return;
  state.localState = rolloverDailySnapshot(state.localState);
  localStorage.setItem(storageKey(state.user), JSON.stringify(state.localState));
};

const materializeWorkspaceSnapshot = (snapshot) =>
  rolloverDailySnapshot(mergeStateWithSeed(normalizeState({ ...createDefaultState(), ...snapshot })));

const getSnapshotTimestamp = (snapshot) => {
  const timestamp = Date.parse(snapshot?.updatedAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getWorkspaceRevision = (snapshot) => normalizeWorkspaceMeta(snapshot?.workspaceMeta).revision;

const getWorkspaceSyncRank = (snapshot) => {
  const revision = getWorkspaceRevision(snapshot);
  const timestamp = getSnapshotTimestamp(snapshot);
  return { revision, timestamp };
};

const isRemoteSnapshotNewer = (remoteSnapshot, localSnapshot) => {
  if (!remoteSnapshot) return false;
  if (!localSnapshot) return true;

  const remoteRank = getWorkspaceSyncRank(remoteSnapshot);
  const localRank = getWorkspaceSyncRank(localSnapshot);

  if (remoteRank.revision !== localRank.revision) {
    return remoteRank.revision > localRank.revision;
  }

  if (remoteRank.timestamp !== localRank.timestamp) {
    return remoteRank.timestamp > localRank.timestamp;
  }

  return false;
};

const clearWorkspaceSyncListener = () => {
  if (typeof firestoreWorkspaceListener === "function") {
    firestoreWorkspaceListener();
  }
  firestoreWorkspaceListener = null;
};

const syncWorkspaceWithCloud = async (syncMessage = "Sincronizando com a nuvem...") => {
  if (!state.user || state.loading || state.saving) return;

  state.syncMessage = syncMessage;
  renderDashboard();

  try {
    const remoteSnapshot = await loadUserWorkspace(state.user.uid);
    if (isRemoteSnapshotNewer(remoteSnapshot, state.localState)) {
      applyWorkspaceSnapshot(remoteSnapshot, "Workspace atualizado automaticamente pela nuvem");
      state.lastSavedAt = remoteSnapshot.updatedAt || state.lastSavedAt;
      return;
    }

    if (!remoteSnapshot || isRemoteSnapshotNewer(state.localState, remoteSnapshot)) {
      await persistWorkspaceToFirestore(
        remoteSnapshot ? "Workspace sincronizado automaticamente com a nuvem" : "Workspace criado na nuvem"
      );
      return;
    }

    state.syncMessage = "Workspace já sincronizado";
    renderDashboard();
  } catch (error) {
    state.syncMessage = error?.message || "Falha ao sincronizar com a nuvem";
    renderDashboard();
  }
};

const startWorkspaceSyncListener = async () => {
  clearWorkspaceSyncListener();
  if (!state.user) return;

  try {
    firestoreWorkspaceListener = await listenUserWorkspace(state.user.uid, (remoteSnapshot) => {
      if (!state.user || state.loading) return;

      if (!remoteSnapshot) {
        if (state.dirty) {
          scheduleFirestoreAutoSync();
        } else {
          state.syncMessage = "Aguardando o primeiro salvamento na nuvem";
          renderDashboard();
        }
        return;
      }

      if (isRemoteSnapshotNewer(remoteSnapshot, state.localState)) {
        applyWorkspaceSnapshot(remoteSnapshot, "Workspace atualizado automaticamente pela nuvem");
        state.lastSavedAt = remoteSnapshot.updatedAt || state.lastSavedAt;
        return;
      }

      if (isRemoteSnapshotNewer(state.localState, remoteSnapshot) && state.dirty) {
        scheduleFirestoreAutoSync();
      }
    });
  } catch (error) {
    state.syncMessage = error?.message || "Falha ao conectar a sincronização em tempo real";
    renderDashboard();
  }
};

const handleWorkspaceRecovery = () => {
  if (!state.user || state.loading) return;
  void syncWorkspaceWithCloud("Retomando sincronização com a nuvem...");
};

const handleVisibilityRecovery = () => {
  if (document.visibilityState !== "visible") return;
  handleWorkspaceRecovery();
};

const bindWorkspaceRecoveryEvents = () => {
  if (workspaceRecoveryEventsBound) return;
  window.addEventListener("online", handleWorkspaceRecovery, { passive: true });
  window.addEventListener("focus", handleWorkspaceRecovery, { passive: true });
  window.addEventListener("pageshow", handleWorkspaceRecovery, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityRecovery, { passive: true });
  workspaceRecoveryEventsBound = true;
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
  runDashboardEffects();
  requestAnimationFrame(() => {
    const chart = app.querySelector(".radar-chart");
    if (chart) {
      chart.classList.add("is-ready");
    }
    const organogramStage = app.querySelector(".organogram-stage.is-ready");
    const organogramRoot = app.querySelector(".organogram-stage.is-ready .organogram-root");
    const organogramSnapshotId = state.localState.organogram?.latest?.id || null;
    if (organogramStage && organogramRoot && organogramSnapshotId && centeredOrganogramSnapshotId !== organogramSnapshotId) {
      const top = Math.max(0, (organogramStage.scrollHeight - organogramStage.clientHeight) / 2);
      organogramStage.scrollTop = top;
      organogramStage.scrollLeft = 0;
      centeredOrganogramSnapshotId = organogramSnapshotId;
    }
    syncScrollTopButtonVisibility();
  });
};

const buildDashboardMarkup = () =>
  createDashboardMarkup({
    ...state.localState,
    drafts: state.drafts,
    panelStates: state.panelStates,
    ui: {
      dirty: state.dirty,
      syncMessage: state.syncMessage,
      saving: state.saving,
      lastSavedAt: state.lastSavedAt,
      showHiddenLeaves: state.localState.showHiddenLeaves,
      openNodeKeys: [...expandedNodeKeys],
      openLeafMenuId,
      showFirestoreSync: isFirestoreSyncVisible(),
      nextStepReminderOpen: state.nextStepReminderOpen,
      dashboardPhrases: state.dashboardPhrases,
      dashboardPhrasesLoaded: state.dashboardPhrasesLoaded,
    },
  });

const isFirestoreSyncVisible = () => {
  if (!dashboardOpenedAt) return false;
  return Date.now() - dashboardOpenedAt >= 60 * 60 * 1000;
};

const clearFirestoreTimers = () => {
  clearTimeout(firestoreButtonRevealTimer);
  clearTimeout(firestoreAutoSyncTimer);
  firestoreButtonRevealTimer = null;
  firestoreAutoSyncTimer = null;
};

const clearNextStepReminderTimer = () => {
  clearTimeout(nextStepReminderTimer);
  nextStepReminderTimer = null;
};

const recordNextStepReminderShown = (dateStamp) => {
  if (!state.localState?.nextStep) return;
  state.localState = {
    ...state.localState,
    nextStep: {
      ...state.localState.nextStep,
      reminderLastShownDateStamp: dateStamp,
    },
  };
  state.localState = bumpWorkspaceMeta(state.localState);
  syncDerivedState();
  state.dirty = true;
  saveState();
};

const openNextStepReminder = () => {
  const dueDateStamp = state.localState?.nextStep?.dueDateStamp;
  if (!dueDateStamp) return;
  const todayStamp = getLocalDateStamp();
  if (state.localState.nextStep?.reminderLastShownDateStamp === todayStamp) {
    return;
  }

  recordNextStepReminderShown(todayStamp);
  state.nextStepReminderOpen = true;
  ensureDashboardPhrasesLoaded();
  renderDashboard();
};

const closeNextStepReminder = () => {
  if (!state.nextStepReminderOpen) return;
  state.nextStepReminderOpen = false;
  renderDashboard();
};

const scheduleNextStepReminderCheck = () => {
  clearNextStepReminderTimer();
  if (!state.user || state.loading) return;

  const nextStep = state.localState?.nextStep;
  if (!nextStep?.leafId || !nextStep.dueDateStamp) return;

  const todayStamp = getLocalDateStamp();
  if (todayStamp > nextStep.dueDateStamp) {
    return;
  }

  const now = new Date();
  const fiveAmToday = new Date(now);
  fiveAmToday.setHours(5, 0, 0, 0);

  if (now.getTime() < fiveAmToday.getTime()) {
    const delay = Math.max(0, fiveAmToday.getTime() - Date.now() + 50);
    nextStepReminderTimer = window.setTimeout(() => {
      nextStepReminderTimer = null;
      scheduleNextStepReminderCheck();
    }, delay);
    return;
  }

  if (nextStep.reminderLastShownDateStamp !== todayStamp) {
    openNextStepReminder();
  }

  const delay = Math.max(0, getNextLocalFiveAmTimestamp(now) - Date.now() + 50);
  nextStepReminderTimer = window.setTimeout(() => {
    nextStepReminderTimer = null;
    scheduleNextStepReminderCheck();
  }, delay);
};

const scheduleFirestoreButtonReveal = () => {
  if (!dashboardOpenedAt || isFirestoreSyncVisible()) return;
  const remaining = Math.max(0, 60 * 60 * 1000 - (Date.now() - dashboardOpenedAt));
  clearTimeout(firestoreButtonRevealTimer);
  firestoreButtonRevealTimer = window.setTimeout(() => {
    firestoreButtonRevealTimer = null;
    if (state.user && !state.loading) {
      renderDashboard();
    }
  }, remaining + 50);
};

const scheduleFirestoreAutoSync = () => {
  if (!state.user || state.loading || state.saving || !state.dirty) return;
  const signature = state.localState?.updatedAt || "";
  if (!signature || signature === lastFirestoreAutoSyncSignature) return;

  clearTimeout(firestoreAutoSyncTimer);
  firestoreAutoSyncTimer = window.setTimeout(async () => {
    firestoreAutoSyncTimer = null;
    if (!state.user || state.loading || state.saving || !state.dirty) return;
    if ((state.localState?.updatedAt || "") !== signature) return;

    const saved = await persistWorkspaceToFirestore("Sincronizado automaticamente");
    lastFirestoreAutoSyncSignature = saved ? signature : "";
  }, 600);
};

const runDashboardEffects = () => {
  scheduleFirestoreButtonReveal();
  scheduleFirestoreAutoSync();
  scheduleNextStepReminderCheck();
};

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

  runDashboardEffects();
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
  const activeLeaves = getActiveLeaves(state.localState.baseVariables);
  const currentNextLeaf =
    activeLeaves.find((leaf) => leaf.id === state.localState.nextStep.leafId) ||
    activeLeaves[0];
  const organogramSnapshot = state.localState.organogram?.latest || null;

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
  setText('[data-summary="session-mood"]', summary.mood.label);
  setText('[data-summary="session-state"]', summary.mood.label);
  setText('[data-summary="session-average-cardinal"]', formatPercent(summary.averageCardinal));
  setText('[data-summary="session-changed-leaves"]', String(summary.changedLeaves));
  setText('[data-summary="session-next-step"]', currentNextLeaf?.name || "Definir");
  setText('[data-summary="session-updated-at"]', formatDateTime(state.localState.updatedAt));
  setText(
    '[data-summary="session-last-saved-at"]',
    state.lastSavedAt ? formatDateTime(state.lastSavedAt) : "Ainda não enviado"
  );
  setText('[data-summary="session-recent-changes"]', String(summary.changedLeaves));
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
  setText(
    '[data-summary="organogram-generated-at"]',
    organogramSnapshot ? formatDateTime(organogramSnapshot.generatedAt) : "Nunca gerado"
  );
  setText(
    '[data-summary="organogram-leaf-count"]',
    `${organogramSnapshot ? organogramSnapshot.metrics.leafCount : 0} folhas`
  );
  setText(
    '[data-summary="organogram-node-count"]',
    `${organogramSnapshot ? organogramSnapshot.metrics.nodeCount : 0} galhos`
  );
};

const refreshWeeklyReviewPanel = () => {
  const sections = app.querySelectorAll(".modal--reminder");
  if (!sections.length) return;

  const score =
    state.drafts.weeklyReviewScore !== null
      ? Number(state.drafts.weeklyReviewScore)
      : Number(state.localState.weeklyReview?.moodValue ?? 0);
  const scoreText = `${score > 0 ? "+" : ""}${score}`;
  const scoreLabel = statusLabels[score] || "Neutro";

  sections.forEach((section) => {
    const currentScore = section.querySelector("[data-weekly-review-score-current]");
    if (currentScore) {
      currentScore.textContent = scoreText;
    }

    const currentLabel = section.querySelector("[data-weekly-review-score-label]");
    if (currentLabel) {
      currentLabel.textContent = scoreLabel;
    }

    const input = section.querySelector('[data-field="weekly-review-score"]');
    if (input) {
      input.value = String(score);
    }

    section.querySelectorAll("[data-weekly-score-step]").forEach((button) => {
      const buttonScore = Number(button.dataset.weeklyScoreStep);
      button.classList.toggle("is-active", buttonScore === score);
    });

    section.querySelectorAll("[data-weekly-score-label]").forEach((label) => {
      const labelScore = Number(label.dataset.weeklyScoreLabel);
      label.classList.toggle("is-active", labelScore === score);
    });
  });
};

const refreshRadarChart = () => {
  const chart = app.querySelector('[data-dashboard-section="overview-chart"]');
  if (!chart) return;
  const template = document.createElement("div");
  template.innerHTML = createDashboardMarkup({
    ...state.localState,
    ui: {
      dirty: state.dirty,
      syncMessage: state.syncMessage,
      saving: state.saving,
      lastSavedAt: state.lastSavedAt,
    },
  });
  const nextChart = template.querySelector('[data-dashboard-section="overview-chart"]');
  if (nextChart) {
    chart.innerHTML = nextChart.innerHTML;
  }
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
  state.localState = bumpWorkspaceMeta(state.localState);
  syncDerivedState();
  state.dirty = true;
  state.syncMessage = "AlteraÃ§Ãµes salvas localmente";
  refreshSummaryBindings();
  patchDashboardSections(partialSelectors);
  saveState();
};

const applyWorkspaceSnapshot = (nextState, syncMessage) => {
  state.localState = materializeWorkspaceSnapshot(nextState);
  syncDerivedState();
  state.dirty = false;
  state.syncMessage = syncMessage;
  state.lastSavedAt = new Date().toISOString();
  state.nextStepReminderOpen = false;
  state.drafts = {
    weeklyReviewScore: null,
  };
  state.panelStates = {
    weeklyReviewCollapsed: false,
    nextStepCollapsed: false,
  };
  saveState();
  renderDashboard();
};

const setWeeklyReviewScoreLocal = (score) => {
  state.drafts.weeklyReviewScore = Number(score);
  refreshWeeklyReviewPanel();
};

const commitWeeklyReviewScore = () => {
  const score =
    state.drafts.weeklyReviewScore !== null
      ? Number(state.drafts.weeklyReviewScore)
      : Number(state.localState.weeklyReview?.moodValue ?? 0);
  state.drafts.weeklyReviewScore = score;
  setLocalStatePartial((current) => setWeeklyReviewScore(current, score), [".modal--reminder"]);
  refreshWeeklyReviewPanel();
};

const setWeeklyReviewCollapsed = (collapsed) => {
  state.panelStates.weeklyReviewCollapsed = Boolean(collapsed);
  renderDashboard();
};

const setNextStepCollapsed = (collapsed) => {
  state.panelStates.nextStepCollapsed = Boolean(collapsed);
  renderDashboard();
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
  ensureDashboardPhrasesLoaded();
  renderDashboard();
  saveState();
};

const setLocalState = (updater) => {
  state.localState = rolloverDailySnapshot(normalizeState(updater(cloneState(state.localState))));
  state.localState = bumpWorkspaceMeta(state.localState);
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

const persistWorkspaceToFirestore = async (successMessage = "Salvo no Firestore") => {
  if (!state.user || state.saving) return;

  state.saving = true;
  state.syncMessage = "Enviando para o Firestore...";
  renderDashboard();

  try {
    await saveUserWorkspace(state.user.uid, state.localState);
    state.lastSavedAt = state.localState.updatedAt || new Date().toISOString();
    state.dirty = false;
    state.syncMessage = successMessage;
    return true;
  } catch (error) {
    state.syncMessage = error?.message || "Falha ao salvar no Firestore";
    return false;
  } finally {
    state.saving = false;
    renderDashboard();
  }
};

const handleManualFirestoreSave = async () => {
  await persistWorkspaceToFirestore("Salvo no Firestore");
};

const handleFirestoreSync = async () => {
  await syncWorkspaceWithCloud("Sincronizando manualmente com a nuvem...");
};

const handleGenerateOrganogram = async () => {
  const snapshot = buildOrganogramSnapshot(state.localState);

  setLocalState((current) => {
    const history = [
      {
        id: snapshot.id,
        generatedAt: snapshot.generatedAt,
        leafCount: snapshot.metrics.leafCount,
        nodeCount: snapshot.metrics.nodeCount,
      },
      ...(current.organogram?.history || []),
    ].slice(0, 5);

    return {
      ...current,
      organogram: {
        latest: snapshot,
        history,
      },
    };
  });

  await persistWorkspaceToFirestore("Organograma gerado e sincronizado");
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

const createLeafForNode = ({ cardinalId, nodeId, nodeName }) => {
  const name = window.prompt("Nome da nova folha:");
  if (name === null) return;

  const trimmed = String(name || "").trim();
  if (!trimmed) return;

  openNodesForCardinal(cardinalId);
  openLeafMenuId = null;
  setLocalState((current) => createLeafInNode(current, { cardinalId, nodeId, nodeName, name: trimmed }));
};

const renameLeaf = (leafId) => {
  const leaf = state.localState.baseVariables.find((item) => item.id === leafId);
  if (!leaf) return;

  const currentName = leaf.customName || leaf.name || "";
  const nextName = window.prompt("Digite o novo nome da folha:", currentName);
  if (nextName === null) return;

  setLocalState((current) => setLeafCustomName(current, leafId, nextName));
};

const toggleLeafMenu = (leafId) => {
  openLeafMenuId = openLeafMenuId === leafId ? null : leafId;
  renderDashboard();
};

const hideLeaf = (leafId) => {
  openLeafMenuId = null;
  setLocalState((current) => toggleLeafHidden(current, leafId));
};

const removeLeaf = (leafId) => {
  const leaf = state.localState.baseVariables.find((item) => item.id === leafId);
  if (!leaf) return;

  const confirmed = window.confirm(`Excluir a folha "${getLeafDisplayName(leaf)}"? Ela deixará de participar dos cálculos.`);
  if (!confirmed) return;

  openLeafMenuId = null;
  setLocalState((current) => deleteLeaf(current, leafId));
};

async function handleDashboardClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "sign-out") {
    handleSignOut();
    return;
  }

  if (action === "save-firestore") {
    await handleManualFirestoreSave();
    return;
  }

  if (action === "sync-firestore") {
    await handleFirestoreSync();
    return;
  }

  if (action === "generate-organogram") {
    try {
      await handleGenerateOrganogram();
    } catch (error) {
      state.syncMessage = error?.message || "Não foi possível gerar o organograma";
      renderDashboard();
    }
    return;
  }

  if (action === "export-organogram") {
    const snapshot = state.localState.organogram?.latest;
    if (!snapshot) return;
    try {
      await downloadOrganogramSnapshot(snapshot);
      state.syncMessage = "Organograma baixado como imagem";
    } catch (error) {
      state.syncMessage = error?.message || "Não foi possível exportar o organograma";
    }
    renderDashboard();
    return;
  }

  if (action === "share-organogram") {
    const snapshot = state.localState.organogram?.latest;
    if (!snapshot) return;
    try {
      await shareOrganogramSnapshot(snapshot);
      state.syncMessage = "Organograma pronto para compartilhamento";
    } catch (error) {
      state.syncMessage = error?.message || "Não foi possível compartilhar o organograma";
    }
    renderDashboard();
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
    setWeeklyReviewScoreLocal(value);
    return;
  }

  if (action === "commit-weekly-review") {
    commitWeeklyReviewScore();
    closeNextStepReminder();
    return;
  }

  if (action === "open-modal") {
    setLocalState((current) => toggleModal(current, true));
    return;
  }

  if (action === "toggle-next-step-card") {
    setNextStepCollapsed(false);
    return;
  }

  if (action === "close-next-step-reminder") {
    closeNextStepReminder();
    return;
  }

  if (action === "create-leaf") {
    createLeafForNode({
      cardinalId: target.dataset.cardinalId,
      nodeId: target.dataset.nodeId,
      nodeName: target.dataset.nodeName,
    });
    return;
  }

  if (action === "toggle-leaf-menu") {
    toggleLeafMenu(target.dataset.leafId);
    return;
  }

  if (action === "toggle-leaf-hidden") {
    hideLeaf(target.dataset.leafId);
    return;
  }

  if (action === "delete-leaf") {
    removeLeaf(target.dataset.leafId);
    return;
  }

  if (action === "rename-leaf") {
    renameLeaf(target.dataset.leafId);
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
      state.nextStepReminderOpen = false;
      setLocalState((current) => selectNextStep(current, leaf));
      setNextStepCollapsed(true);
    }
    return;
  }

  if (action === "toggle-archive") {
    setLocalState((current) => toggleArchive(current));
  }

  if (action === "toggle-hidden-leaves") {
    setLocalState((current) => toggleShowHiddenLeaves(current));
    return;
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
    setWeeklyReviewScoreLocal(value);
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

  commitLeafHorizon(field);
}

function handleDashboardKeydown(event) {
  if (event.key !== "Escape") return;
  if (openLeafMenuId) {
    openLeafMenuId = null;
    renderDashboard();
    return;
  }
  const modal = app.querySelector(".modal.is-open");
  if (modal) {
    setLocalState((current) => toggleModal(current, false));
  }
}

const setupAuthListener = async () => {
  try {
    await onAuthStateChanged((user) => {
      if (user) {
        state.user = { uid: user.uid, email: user.email };
        state.loading = true;
        state.authReady = true;
        state.error = "";
        expandedNodeKeys.clear();
        openLeafMenuId = null;
        state.nextStepReminderOpen = false;
        dashboardOpenedAt = Date.now();
        centeredOrganogramSnapshotId = null;
        lastFirestoreAutoSyncSignature = "";
        clearFirestoreTimers();
        clearWorkspaceSyncListener();
        render();

        (async () => {
          const localState = readSavedState(state.user);
          let remoteState = null;

          try {
            remoteState = await loadUserWorkspace(state.user.uid);
          } catch {
            remoteState = null;
          }

          const shouldUseLocal = Boolean(localState) && !isRemoteSnapshotNewer(remoteState, localState);
          const nextState = shouldUseLocal ? localState : remoteState || localState || createDefaultState();

          state.localState = materializeWorkspaceSnapshot(nextState);
          syncDerivedState();
          state.drafts = {
            weeklyReviewScore: null,
          };
          state.panelStates = {
            weeklyReviewCollapsed: false,
            nextStepCollapsed: false,
          };
          state.dirty = false;
          state.syncMessage = shouldUseLocal
            ? "Workspace local carregado e pronto para sincronizacao"
            : remoteState
              ? "Workspace carregado do Firestore"
              : "Workspace inicial pronto";
          state.dashboardPhrases = null;
          state.dashboardPhrasesLoaded = false;

          saveState();
          state.loading = false;
          render();

          await startWorkspaceSyncListener();

          if (shouldUseLocal || !remoteState) {
            await persistWorkspaceToFirestore(
              shouldUseLocal ? "Workspace local sincronizado com a nuvem" : "Workspace criado na nuvem"
            );
          } else {
            state.syncMessage = "Workspace carregado do Firestore";
            renderDashboard();
          }
        })();
        return;
      }

      state.user = null;
      state.authReady = true;
      state.loading = false;
      state.localState = createDefaultState();
      state.drafts = {
        weeklyReviewScore: null,
      };
      state.panelStates = {
        weeklyReviewCollapsed: false,
        nextStepCollapsed: false,
      };
      expandedNodeKeys.clear();
      openLeafMenuId = null;
      state.nextStepReminderOpen = false;
      clearTimeout(leafSearchTimer);
      leafSearchTimer = null;
      state.dirty = false;
      state.lastSavedAt = null;
      state.syncMessage = "Aguardando login";
      dashboardOpenedAt = null;
      centeredOrganogramSnapshotId = null;
      lastFirestoreAutoSyncSignature = "";
      state.dashboardPhrases = null;
      state.dashboardPhrasesLoaded = false;
      clearFirestoreTimers();
      clearWorkspaceSyncListener();
      clearNextStepReminderTimer();
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
    state.localState = materializeWorkspaceSnapshot(JSON.parse(event.newValue));
    renderDashboard();
  } catch {
    // Mantém o estado atual se o payload externo vier inválido.
  }
});

setupAuthListener();
bindScrollTopButtonBehavior();
bindWorkspaceRecoveryEvents();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA continua funcionando sem cache offline.
    });
  });
}

