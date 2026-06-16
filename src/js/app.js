import {
  createDefaultState,
  normalizeState,
  updateCardinalValue,
  updateLeafValue,
  setWeeklyReviewScore,
  setWeeklyReviewNote,
  selectNextStep,
  setLeafSearchQuery,
  toggleModal,
  toggleArchive,
} from "./services/variableService.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  isFirebaseReady,
  saveUserWorkspace,
} from "./firebase/firebase.js";
import { createDashboardMarkup } from "./ui/dashboard.js";
import { getMoodFromAverageValue } from "./services/moodService.js";
import { average } from "./utils/calculations.js";
import { formatDateTime } from "./utils/dates.js";

const STORAGE_PREFIX = "sobrecarga-state:";
const app = document.getElementById("app");

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

const cloneState = (value) => JSON.parse(JSON.stringify(value));

const storageKey = (user) => `${STORAGE_PREFIX}${user.uid || user.email || "guest"}`;

const loadSavedState = (user) => {
  try {
    const saved = localStorage.getItem(storageKey(user));
    if (!saved) return normalizeState(createDefaultState());
    return normalizeState({ ...createDefaultState(), ...JSON.parse(saved) });
  } catch {
    return normalizeState(createDefaultState());
  }
};

const saveState = () => {
  if (!state.user) return;
  localStorage.setItem(storageKey(state.user), JSON.stringify(state.localState));
};

const syncDerivedState = () => {
  const values = state.localState.cardinals.map((item) => item.value);
  const mood = getMoodFromAverageValue(values);
  state.localState = {
    ...state.localState,
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
  app.innerHTML = createDashboardMarkup({
    ...state.localState,
    ui: {
      dirty: state.dirty,
      syncMessage: state.syncMessage,
      saving: state.saving,
      lastSavedAt: state.lastSavedAt,
    },
  });
  bindDashboardEvents();
  requestAnimationFrame(() => {
    const chart = app.querySelector(".radar-chart");
    if (chart) {
      chart.classList.add("is-ready");
    }
  });
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
  state.localState = normalizeState(updater(cloneState(state.localState)));
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

const bindDashboardEvents = () => {
  if (dashboardEventsBound) return;
  app.addEventListener("click", handleDashboardClick);
  app.addEventListener("input", handleDashboardInput);
  app.addEventListener("change", handleDashboardChange);
  app.addEventListener("keydown", handleDashboardKeydown);
  dashboardEventsBound = true;
};

const unbindDashboardEvents = () => {
  if (!dashboardEventsBound) return;
  app.removeEventListener("click", handleDashboardClick);
  app.removeEventListener("input", handleDashboardInput);
  app.removeEventListener("change", handleDashboardChange);
  app.removeEventListener("keydown", handleDashboardKeydown);
  dashboardEventsBound = false;
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

  if (action === "cardinal-delta") {
    const delta = Number(target.dataset.delta);
    const cardinalId = target.dataset.cardinalId;
    setLocalState((current) => updateCardinalValue(current, cardinalId, delta));
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
}

function handleDashboardInput(event) {
  const field = event.target.closest("[data-field]");
  if (!field) return;

  if (field.dataset.field === "leaf-search") {
    const query = field.value;
    state.localState = setLeafSearchQuery(cloneState(state.localState), query);
    clearTimeout(leafSearchTimer);
    leafSearchTimer = setTimeout(() => {
      syncDerivedState();
      renderDashboard();
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
        state.user = { uid: user.uid, email: user.email };
        state.loading = true;
        state.authReady = true;
        state.error = "";
        render();
        state.localState = loadSavedState(state.user);
        state.loading = false;
        state.dirty = false;
        state.syncMessage = "Carregado do localStorage";
        render();
        return;
      }

      state.user = null;
      state.authReady = true;
      state.loading = false;
      state.localState = createDefaultState();
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
    state.localState = normalizeState({ ...createDefaultState(), ...JSON.parse(event.newValue) });
    renderDashboard();
  } catch {
    // Mantém o estado atual se o payload externo vier inválido.
  }
});

setupAuthListener();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA continua funcionando sem cache offline.
    });
  });
}
