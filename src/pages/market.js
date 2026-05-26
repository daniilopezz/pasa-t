import { renderControlPanel } from "../components/ControlPanel.js";
import { renderDrinkBoard } from "../components/DrinkBoard.js";
import {
  GOLDEN_TIME_DURATION_MS,
  PRICE_UPDATE_INTERVAL_MS,
} from "../data/prices.js";
import { formatTime } from "../utils/formatPrice.js";
import { exitFullscreen, isFullscreen, toggleFullscreen } from "../utils/fullscreen.js";
import {
  generateNewPrices,
  setAllPricesToGoldenTime,
} from "../utils/priceEngine.js";
import { loadState, saveState } from "../utils/storage.js";

const STORAGE_KEY = "new-pasa-t-market-state-v1";
const GOLDEN_TIME_SOUND_PATH = "/public/sounds/soundreality-airhorn-fx-343682.mp3";

const fallbackState = {
  isActive: false,
  isGoldenTime: false,
  prices: {},
  lastMinimumUse: {},
  nextUpdateAt: null,
  goldenEndsAt: null,
  scheduledGoldenAt: null,
  preGoldenPrices: null,
};

let state = loadState(STORAGE_KEY, fallbackState);
let tickerId = null;
let goldenTimeAudio = null;

const app = document.querySelector("#app");

document.body.classList.add("market-body");

initialize();

function initialize() {
  normalizeState();
  ensureInitialPrices();
  resolveExpiredTimers();
  bindFullscreenEvents();

  if (state.isActive) {
    startTicker();
  }

  render();
}

function normalizeState() {
  state = {
    ...fallbackState,
    ...state,
    prices: state.prices || {},
    lastMinimumUse: state.lastMinimumUse || {},
  };

  if (!state.isActive) {
    state.scheduledGoldenAt = null;
  }
}

function ensureInitialPrices() {
  if (Object.keys(state.prices).length > 0) {
    return;
  }

  const generated = generateNewPrices({}, state.lastMinimumUse, Date.now());
  state.prices = generated.prices;
  state.lastMinimumUse = generated.lastMinimumUse;
  persistMarketState();
}

function resolveExpiredTimers() {
  const now = Date.now();

  if (state.isGoldenTime && state.goldenEndsAt && state.goldenEndsAt <= now) {
    deactivateGoldenTime(now);
    return;
  }

  if (
    state.isActive &&
    !state.isGoldenTime &&
    state.scheduledGoldenAt &&
    state.scheduledGoldenAt <= now
  ) {
    activateGoldenTime(now);
    return;
  }

  if (state.isActive && !state.isGoldenTime && state.nextUpdateAt && state.nextUpdateAt <= now) {
    generateNewPricesForBoard(now);
  }
}

function bindFullscreenEvents() {
  document.addEventListener("fullscreenchange", syncFullscreenMode);
  document.addEventListener("webkitfullscreenchange", syncFullscreenMode);
  document.addEventListener("keydown", handleFullscreenKeys);
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

function startSystem() {
  const now = Date.now();
  const generated = generateNewPrices(state.prices, state.lastMinimumUse, now);

  state = {
    ...state,
    isActive: true,
    isGoldenTime: false,
    prices: generated.prices,
    lastMinimumUse: generated.lastMinimumUse,
    nextUpdateAt: now + PRICE_UPDATE_INTERVAL_MS,
    goldenEndsAt: null,
    scheduledGoldenAt: null,
    preGoldenPrices: null,
  };

  startTicker();
  persistMarketState();
  render();
}

function stopSystem() {
  state = {
    ...state,
    isActive: false,
    isGoldenTime: false,
    nextUpdateAt: null,
    goldenEndsAt: null,
    scheduledGoldenAt: null,
    preGoldenPrices: null,
  };

  stopTicker();
  persistMarketState();
  render();
}

function generateNewPricesForBoard(now = Date.now()) {
  const generated = generateNewPrices(state.prices, state.lastMinimumUse, now);

  state = {
    ...state,
    prices: generated.prices,
    lastMinimumUse: generated.lastMinimumUse,
    nextUpdateAt: now + PRICE_UPDATE_INTERVAL_MS,
  };

  persistMarketState();
}

function scheduleGoldenTime() {
  if (!state.isActive || state.isGoldenTime || state.scheduledGoldenAt) {
    return;
  }

  const now = Date.now();
  const startsAt =
    state.nextUpdateAt && state.nextUpdateAt > now
      ? state.nextUpdateAt
      : now + PRICE_UPDATE_INTERVAL_MS;

  state = {
    ...state,
    scheduledGoldenAt: startsAt,
  };

  unlockGoldenTimeSound();
  startTicker();
  persistMarketState();
  render();
}

function activateGoldenTime(now = Date.now()) {
  if (!state.isActive || state.isGoldenTime) {
    return;
  }

  state = {
    ...state,
    isGoldenTime: true,
    prices: setAllPricesToGoldenTime(state.prices, now),
    goldenEndsAt: now + GOLDEN_TIME_DURATION_MS,
    scheduledGoldenAt: null,
    preGoldenPrices: state.prices,
  };

  playGoldenTimeSound();
  startTicker();
  persistMarketState();
  render();
}

function deactivateGoldenTime(now = Date.now()) {
  if (!state.isGoldenTime) {
    return;
  }

  const generated = generateNewPrices(
    state.preGoldenPrices || state.prices,
    state.lastMinimumUse,
    now,
  );

  state = {
    ...state,
    isGoldenTime: false,
    prices: generated.prices,
    lastMinimumUse: generated.lastMinimumUse,
    goldenEndsAt: null,
    scheduledGoldenAt: null,
    preGoldenPrices: null,
    nextUpdateAt: state.isActive ? now + PRICE_UPDATE_INTERVAL_MS : null,
  };

  persistMarketState();
  render();
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
  const now = Date.now();

  if (state.isGoldenTime && state.goldenEndsAt && state.goldenEndsAt <= now) {
    deactivateGoldenTime(now);
    return;
  }

  if (
    state.isActive &&
    !state.isGoldenTime &&
    state.scheduledGoldenAt &&
    state.scheduledGoldenAt <= now
  ) {
    activateGoldenTime(now);
    return;
  }

  if (state.isActive && !state.isGoldenTime && state.nextUpdateAt && state.nextUpdateAt <= now) {
    generateNewPricesForBoard(now);
  }

  render();
}

function startTicker() {
  if (tickerId) {
    return;
  }

  tickerId = window.setInterval(tick, 1000);
}

function stopTicker() {
  if (!tickerId) {
    return;
  }

  window.clearInterval(tickerId);
  tickerId = null;
}

function persistMarketState() {
  saveState(STORAGE_KEY, state);
}

function getRemainingSeconds(targetTimestamp) {
  if (!targetTimestamp) {
    return 0;
  }

  return Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000));
}

function getNextUpdateLabel() {
  if (state.isGoldenTime) {
    return "Pausado";
  }

  if (!state.isActive) {
    return formatTime(PRICE_UPDATE_INTERVAL_MS / 1000);
  }

  return formatTime(getRemainingSeconds(state.nextUpdateAt));
}

function getGoldenStatusLabel() {
  if (state.isGoldenTime) {
    return `Golden termina en ${formatTime(getRemainingSeconds(state.goldenEndsAt))}`;
  }

  if (state.scheduledGoldenAt && state.scheduledGoldenAt > Date.now()) {
    return `Golden empieza en ${formatTime(getRemainingSeconds(state.scheduledGoldenAt))}`;
  }

  return state.isActive ? "Golden disponible" : "Golden en espera";
}

function getScheduledGoldenLabel() {
  if (state.scheduledGoldenAt && state.scheduledGoldenAt > Date.now()) {
    return `Golden empieza en ${formatTime(getRemainingSeconds(state.scheduledGoldenAt))}`;
  }

  return "Golden Time manual";
}

function render() {
  const goldenRemainingSeconds = getRemainingSeconds(state.goldenEndsAt);
  const isGoldenScheduled =
    !state.isGoldenTime && state.scheduledGoldenAt && state.scheduledGoldenAt > Date.now();
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
          <img class="arcade-logo" src="/public/logo.png" alt="NEW PASA-T" />
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
            <img src="/public/logo-neon-only.png" alt="" aria-hidden="true" />
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
      stopSystem();
    } else {
      startSystem();
    }
  });

  app.querySelector('[data-action="golden-time"]')?.addEventListener("click", () => {
    scheduleGoldenTime();
  });

  app.querySelector('[data-action="fullscreen"]')?.addEventListener("click", async () => {
    try {
      await toggleFullscreen(document.documentElement);
      syncFullscreenMode();
    } catch (error) {
      console.warn("No se pudo cambiar el modo pantalla completa", error);
    }
  });
}
