import { renderControlPanel } from "../components/ControlPanel.js";
import { renderDrinkBoard } from "../components/DrinkBoard.js";
import { formatTime } from "../utils/formatPrice.js";
import { exitFullscreen, isFullscreen, toggleFullscreen } from "../utils/fullscreen.js";
import {
  advanceMarketState,
  applyMarketAction,
  createFallbackMarketState,
  getPriceUpdateIntervalMs,
  initializeMarketState,
  normalizeMarketState,
} from "../utils/marketStateCore.js";
import { loadState, saveState } from "../utils/storage.js";

const STORAGE_KEY = "new-pasa-t-market-state-v1";
const MARKET_STATE_API_URL = "/api/market-state";
const SYNC_POLL_INTERVAL_MS = 750;
const REMOTE_RETRY_INTERVAL_MS = 5000;
const GOLDEN_TIME_SOUND_PATH = "/public/sounds/soundreality-airhorn-fx-343682.mp3";
const MINUTE_SETTINGS = new Set([
  "priceUpdateIntervalMinutes",
  "goldenTimeDurationMinutes",
]);

let serverTimeOffsetMs = 0;
let hasServerClock = false;
let hasPendingLocalState = false;
let state = initializeMarketState(
  loadState(STORAGE_KEY, createFallbackMarketState()),
  getCurrentTime(),
);
let tickerId = null;
let goldenTimeAudio = null;
let remoteSyncMode = "checking";
let remoteRequestInFlight = false;
let lastRemoteAttemptAt = 0;

const app = document.querySelector("#app");

document.body.classList.add("market-body");

initialize();

function initialize() {
  persistMarketState();
  bindFullscreenEvents();
  startTicker();
  render();
  void syncRemoteState({ force: true });
}

function bindFullscreenEvents() {
  document.addEventListener("fullscreenchange", syncFullscreenMode);
  document.addEventListener("webkitfullscreenchange", syncFullscreenMode);
  document.addEventListener("keydown", handleFullscreenKeys);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void syncRemoteState({ force: true });
    }
  });
  window.addEventListener("focus", () => void syncRemoteState({ force: true }));
  window.addEventListener("online", () => void syncRemoteState({ force: true }));
}

function syncFullscreenMode() {
  document.body.classList.toggle("is-tv-fullscreen", isFullscreen());
}

function handleFullscreenKeys(event) {
  if (event.key !== "F11" || !isFullscreen()) {
    return;
  }

  event.preventDefault();
  exitFullscreen().catch((error) => {
    console.warn("No se pudo salir de pantalla completa con F11", error);
  });
}

async function performMarketAction(action, payload = {}) {
  if (action === "start-system" || action === "schedule-golden-time") {
    unlockGoldenTimeSound();
  }

  const remoteState = await postRemoteAction(action, payload);

  if (remoteState) {
    applyIncomingState(remoteState);
    return;
  }

  applyLocalAction(action, payload);
}

function applyLocalAction(action, payload = {}) {
  hasPendingLocalState = true;
  applyIncomingState(applyMarketAction(state, action, payload, getCurrentTime()));
}

async function postRemoteAction(action, payload = {}) {
  const requestedAt = Date.now();

  try {
    const response = await fetch(MARKET_STATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, payload }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    updateServerClock(body.serverNow, requestedAt, Date.now());
    remoteSyncMode = "shared";
    lastRemoteAttemptAt = Date.now();
    hasPendingLocalState = false;
    return body.state;
  } catch {
    remoteSyncMode = "local";
    return null;
  }
}

async function replaceRemoteState(nextState) {
  const requestedAt = Date.now();

  try {
    const response = await fetch(MARKET_STATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "replace-state", state: nextState }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    updateServerClock(body.serverNow, requestedAt, Date.now());
    remoteSyncMode = "shared";
    lastRemoteAttemptAt = Date.now();
    hasPendingLocalState = false;
    applyIncomingState(body.state);
    return body.state;
  } catch {
    remoteSyncMode = "local";
    return null;
  }
}

async function syncRemoteState({ force = false } = {}) {
  const now = Date.now();
  const retryInterval =
    remoteSyncMode === "local" ? REMOTE_RETRY_INTERVAL_MS : SYNC_POLL_INTERVAL_MS;

  if (remoteRequestInFlight || (!force && now - lastRemoteAttemptAt < retryInterval)) {
    return;
  }

  remoteRequestInFlight = true;
  lastRemoteAttemptAt = now;

  try {
    const requestedAt = Date.now();
    const response = await fetch(MARKET_STATE_API_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    updateServerClock(body.serverNow, requestedAt, Date.now());
    const incomingState = normalizeMarketState(body.state);
    remoteSyncMode = "shared";

    if (hasPendingLocalState && isStateNewer(state, incomingState)) {
      const replacedState = await replaceRemoteState(state);

      if (replacedState) {
        return;
      }

      render();
      return;
    }

    hasPendingLocalState = false;
    applyIncomingState(incomingState);
  } catch {
    if (remoteSyncMode !== "local") {
      remoteSyncMode = "local";
      render();
    }
  } finally {
    remoteRequestInFlight = false;
  }
}

function applyIncomingState(nextState, options = {}) {
  if (!nextState) {
    return;
  }

  const wasGoldenTime = state.isGoldenTime;
  state = normalizeMarketState(nextState);
  persistMarketState();

  if (!wasGoldenTime && state.isGoldenTime && options.playGoldenSound !== false) {
    playGoldenTimeSound();
  }

  render();
}

function updateServerClock(serverNow, requestedAt, receivedAt) {
  const numericServerNow = Number(serverNow);

  if (!Number.isFinite(numericServerNow) || numericServerNow <= 0) {
    return;
  }

  const estimatedClientNow = requestedAt + (receivedAt - requestedAt) / 2;
  serverTimeOffsetMs = numericServerNow - estimatedClientNow;
  hasServerClock = true;
}

function getCurrentTime() {
  return Date.now() + (hasServerClock ? serverTimeOffsetMs : 0);
}

function isStateNewer(candidateState, currentState) {
  const candidate = normalizeMarketState(candidateState);
  const current = normalizeMarketState(currentState);

  if (candidate.updatedAt && current.updatedAt) {
    return candidate.updatedAt > current.updatedAt;
  }

  return candidate.revision > current.revision;
}

function getGoldenTimeAudio() {
  if (!goldenTimeAudio) {
    goldenTimeAudio = new Audio(GOLDEN_TIME_SOUND_PATH);
    goldenTimeAudio.preload = "auto";
  }

  return goldenTimeAudio;
}

function unlockGoldenTimeSound() {
  try {
    const audio = getGoldenTimeAudio();
    audio.muted = true;
    audio.volume = 0;

    const playPromise = audio.play();

    if (playPromise?.then) {
      playPromise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audio.volume = 0.9;
        })
        .catch(() => {
          audio.muted = false;
          audio.volume = 0.9;
        });
    }
  } catch (error) {
    console.warn("No se pudo preparar el sonido de Golden Time", error);
  }
}

function playGoldenTimeSound() {
  try {
    const audio = getGoldenTimeAudio();
    audio.muted = false;
    audio.volume = 0.9;
    audio.currentTime = 0;
    const playPromise = audio.play();

    if (playPromise?.catch) {
      playPromise.catch((error) => {
        console.warn("No se pudo reproducir el sonido de Golden Time", error);
      });
    }
  } catch (error) {
    console.warn("No se pudo reproducir el sonido de Golden Time", error);
  }
}

function tick() {
  void syncRemoteState();

  if (remoteSyncMode === "shared") {
    render();
    return;
  }

  const nextState = advanceMarketState(state, getCurrentTime());
  const hasChanged =
    nextState.revision !== state.revision || nextState.updatedAt !== state.updatedAt;

  if (hasChanged) {
    hasPendingLocalState = true;
    applyIncomingState(nextState);
    return;
  }

  render();
}

function startTicker() {
  if (tickerId) {
    return;
  }

  tickerId = window.setInterval(tick, 1000);
}

function persistMarketState() {
  saveState(STORAGE_KEY, state);
}

function getRemainingSeconds(targetTimestamp) {
  if (!targetTimestamp) {
    return 0;
  }

  return Math.max(0, Math.ceil((targetTimestamp - getCurrentTime()) / 1000));
}

function getNextUpdateLabel() {
  if (state.isGoldenTime) {
    return "Pausado";
  }

  if (!state.isActive) {
    return formatTime(getPriceUpdateIntervalMs(state) / 1000);
  }

  return formatTime(getRemainingSeconds(state.nextUpdateAt));
}

function getScheduledGoldenLabel() {
  if (state.scheduledGoldenAt && state.scheduledGoldenAt > getCurrentTime()) {
    return `Golden empieza en ${formatTime(getRemainingSeconds(state.scheduledGoldenAt))}`;
  }

  return state.isActive ? "Golden Time manual" : "Configura minutos y pulsa iniciar";
}

function getControlSyncStatus() {
  return remoteSyncMode === "shared" ? "shared" : "local";
}

function render() {
  const now = getCurrentTime();
  const goldenRemainingSeconds = getRemainingSeconds(state.goldenEndsAt);
  const isGoldenScheduled =
    !state.isGoldenTime && state.scheduledGoldenAt && state.scheduledGoldenAt > now;
  const scheduledGoldenRemainingSeconds = getRemainingSeconds(state.scheduledGoldenAt);
  const mainClockLabel = state.isGoldenTime
    ? formatTime(goldenRemainingSeconds)
    : getNextUpdateLabel();
  const systemStatus = state.isGoldenTime
    ? "GOLDEN TIME"
    : state.isActive
      ? "MERCADO ACTIVO"
      : "PULSA INICIAR";

  document.body.classList.toggle("is-golden-mode", state.isGoldenTime);
  document.body.classList.toggle("is-golden-scheduled", Boolean(isGoldenScheduled));
  syncFullscreenMode();

  app.innerHTML = `
    <main class="market-page arcade-page">
      <section class="arcade-screen" aria-label="Marcador de precios NEW PASA-T">
        <div class="arcade-topline">
          <span class="logo-fx logo-fx-arcade">
            <img class="arcade-logo" src="/public/logo-clean.png" alt="NEW PASA-T" />
          </span>
          <div class="arcade-title">
            <span>NEW PASA-T</span>
            <strong>DRINK MARKET</strong>
          </div>
          <span class="arcade-status">${systemStatus}</span>
        </div>

        ${
          state.isGoldenTime
            ? `<section class="arcade-golden-panel" role="status" aria-live="polite">
                <img class="golden-panel-logo golden-panel-logo-left" src="/public/logo-clean.png" alt="" aria-hidden="true" />
                <div class="golden-panel-copy">
                  <strong>GOLDEN TIME</strong>
                  <span>Todas las bebidas a 5,00 €</span>
                </div>
                <img class="golden-panel-logo golden-panel-logo-right" src="/public/logo-clean.png" alt="" aria-hidden="true" />
              </section>`
            : isGoldenScheduled
              ? `<section class="arcade-golden-panel golden-pending" role="status" aria-live="polite">
                  <img class="golden-panel-logo golden-panel-logo-left" src="/public/logo-clean.png" alt="" aria-hidden="true" />
                  <div class="golden-panel-copy">
                    <strong>GOLDEN TIME</strong>
                    <span>Empieza en ${formatTime(scheduledGoldenRemainingSeconds)}</span>
                  </div>
                  <img class="golden-panel-logo golden-panel-logo-right" src="/public/logo-clean.png" alt="" aria-hidden="true" />
                </section>`
              : ""
        }

        ${renderDrinkBoard({
          prices: state.prices,
          isGoldenTime: state.isGoldenTime,
        })}

        <footer class="arcade-footer">
          <div class="arcade-footer-brand">
            <span class="logo-fx logo-fx-footer">
              <img src="/public/logo-clean.png" alt="" aria-hidden="true" />
            </span>
          </div>

          <div class="arcade-clock" aria-label="Cuenta atrás">
            <span>${state.isGoldenTime ? "TERMINA EN" : "CAMBIO EN"}</span>
            <strong>${mainClockLabel}</strong>
          </div>
        </footer>
      </section>

      <aside class="arcade-controls">
        ${renderControlPanel({
          isActive: state.isActive,
          isGoldenTime: state.isGoldenTime,
          isGoldenScheduled,
          isFullscreenActive: isFullscreen(),
          priceUpdateIntervalMinutes: state.priceUpdateIntervalMinutes,
          goldenTimeDurationMinutes: state.goldenTimeDurationMinutes,
          syncStatus: getControlSyncStatus(),
        })}
        <span class="arcade-schedule">${getScheduledGoldenLabel()}</span>
      </aside>
    </main>
  `;

  bindControlEvents();
}

function bindControlEvents() {
  app.querySelector('[data-action="toggle-system"]')?.addEventListener("click", () => {
    if (state.isActive) {
      void performMarketAction("stop-system");
    } else {
      void performMarketAction("start-system");
    }
  });

  app.querySelector('[data-action="golden-time"]')?.addEventListener("click", () => {
    void performMarketAction("schedule-golden-time");
  });

  app.querySelector('[data-action="fullscreen"]')?.addEventListener("click", async () => {
    try {
      await toggleFullscreen(document.documentElement);
      syncFullscreenMode();
    } catch (error) {
      console.warn("No se pudo cambiar el modo pantalla completa", error);
    }
  });

  app.querySelectorAll('[data-action="adjust-setting"]').forEach((button) => {
    button.addEventListener("click", () => {
      const setting = button.dataset.setting;

      if (state.isActive || !MINUTE_SETTINGS.has(setting)) {
        return;
      }

      const step = Number(button.dataset.step || 0);
      const currentValue = Number(state[setting] || 0);
      updateMinuteSettings({ [setting]: currentValue + step });
    });
  });

  app.querySelectorAll("[data-setting-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const setting = input.dataset.settingInput;

      if (state.isActive || !MINUTE_SETTINGS.has(setting)) {
        return;
      }

      updateMinuteSettings({ [setting]: input.value });
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
  });
}

function updateMinuteSettings(patch) {
  void performMarketAction("update-settings", {
    priceUpdateIntervalMinutes: state.priceUpdateIntervalMinutes,
    goldenTimeDurationMinutes: state.goldenTimeDurationMinutes,
    ...patch,
  });
}
