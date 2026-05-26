import {
  DEFAULT_GOLDEN_TIME_DURATION_MINUTES,
  DEFAULT_PRICE_UPDATE_INTERVAL_MINUTES,
  MAX_GOLDEN_TIME_DURATION_MINUTES,
  MAX_PRICE_UPDATE_INTERVAL_MINUTES,
  MIN_GOLDEN_TIME_DURATION_MINUTES,
  MIN_PRICE_UPDATE_INTERVAL_MINUTES,
} from "../data/prices.js";
import {
  generateNewPrices,
  setAllPricesToGoldenTime,
} from "./priceEngine.js";

export function createFallbackMarketState() {
  return {
    isActive: false,
    isGoldenTime: false,
    prices: {},
    lastMinimumUse: {},
    nextUpdateAt: null,
    goldenEndsAt: null,
    scheduledGoldenAt: null,
    preGoldenPrices: null,
    priceUpdateIntervalMinutes: DEFAULT_PRICE_UPDATE_INTERVAL_MINUTES,
    goldenTimeDurationMinutes: DEFAULT_GOLDEN_TIME_DURATION_MINUTES,
    revision: 0,
    updatedAt: null,
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeTimestamp(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function clampMinutes(value, fallbackValue, minValue, maxValue) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallbackValue;
  }

  return Math.min(maxValue, Math.max(minValue, Math.round(numericValue)));
}

function commitState(state, now = Date.now()) {
  return {
    ...state,
    revision: Number(state.revision || 0) + 1,
    updatedAt: now,
  };
}

export function normalizeMarketState(rawState = {}) {
  const fallbackState = createFallbackMarketState();
  const candidateState = isObject(rawState) ? rawState : {};

  const state = {
    ...fallbackState,
    ...candidateState,
    isActive: Boolean(candidateState.isActive),
    isGoldenTime: Boolean(candidateState.isGoldenTime),
    prices: isObject(candidateState.prices) ? candidateState.prices : {},
    lastMinimumUse: isObject(candidateState.lastMinimumUse)
      ? candidateState.lastMinimumUse
      : {},
    nextUpdateAt: normalizeTimestamp(candidateState.nextUpdateAt),
    goldenEndsAt: normalizeTimestamp(candidateState.goldenEndsAt),
    scheduledGoldenAt: normalizeTimestamp(candidateState.scheduledGoldenAt),
    preGoldenPrices: isObject(candidateState.preGoldenPrices)
      ? candidateState.preGoldenPrices
      : null,
    priceUpdateIntervalMinutes: clampMinutes(
      candidateState.priceUpdateIntervalMinutes,
      fallbackState.priceUpdateIntervalMinutes,
      MIN_PRICE_UPDATE_INTERVAL_MINUTES,
      MAX_PRICE_UPDATE_INTERVAL_MINUTES,
    ),
    goldenTimeDurationMinutes: clampMinutes(
      candidateState.goldenTimeDurationMinutes,
      fallbackState.goldenTimeDurationMinutes,
      MIN_GOLDEN_TIME_DURATION_MINUTES,
      MAX_GOLDEN_TIME_DURATION_MINUTES,
    ),
    revision: Math.max(0, Math.floor(Number(candidateState.revision || 0))),
    updatedAt: normalizeTimestamp(candidateState.updatedAt),
  };

  if (!state.isActive) {
    state.isGoldenTime = false;
    state.nextUpdateAt = null;
    state.goldenEndsAt = null;
    state.scheduledGoldenAt = null;
    state.preGoldenPrices = null;
  }

  if (!state.isGoldenTime) {
    state.goldenEndsAt = null;
    state.preGoldenPrices = null;
  }

  return state;
}

export function getPriceUpdateIntervalMs(state) {
  const normalizedState = normalizeMarketState(state);
  return normalizedState.priceUpdateIntervalMinutes * 60 * 1000;
}

export function getGoldenTimeDurationMs(state) {
  const normalizedState = normalizeMarketState(state);
  return normalizedState.goldenTimeDurationMinutes * 60 * 1000;
}

export function ensureInitialPrices(rawState, now = Date.now()) {
  const state = normalizeMarketState(rawState);

  if (Object.keys(state.prices).length > 0) {
    return state;
  }

  const generated = generateNewPrices({}, state.lastMinimumUse, now);

  return commitState(
    {
      ...state,
      prices: generated.prices,
      lastMinimumUse: generated.lastMinimumUse,
    },
    now,
  );
}

export function startMarketSystem(rawState, now = Date.now()) {
  const state = ensureInitialPrices(rawState, now);
  const generated = generateNewPrices(state.prices, state.lastMinimumUse, now);

  return commitState(
    {
      ...state,
      isActive: true,
      isGoldenTime: false,
      prices: generated.prices,
      lastMinimumUse: generated.lastMinimumUse,
      nextUpdateAt: now + getPriceUpdateIntervalMs(state),
      goldenEndsAt: null,
      scheduledGoldenAt: null,
      preGoldenPrices: null,
    },
    now,
  );
}

export function stopMarketSystem(rawState, now = Date.now()) {
  const state = normalizeMarketState(rawState);

  return commitState(
    {
      ...state,
      isActive: false,
      isGoldenTime: false,
      nextUpdateAt: null,
      goldenEndsAt: null,
      scheduledGoldenAt: null,
      preGoldenPrices: null,
    },
    now,
  );
}

export function updateMarketSettings(rawState, settings = {}, now = Date.now()) {
  const state = normalizeMarketState(rawState);

  if (state.isActive) {
    return state;
  }

  const nextState = {
    ...state,
    priceUpdateIntervalMinutes: clampMinutes(
      settings.priceUpdateIntervalMinutes,
      state.priceUpdateIntervalMinutes,
      MIN_PRICE_UPDATE_INTERVAL_MINUTES,
      MAX_PRICE_UPDATE_INTERVAL_MINUTES,
    ),
    goldenTimeDurationMinutes: clampMinutes(
      settings.goldenTimeDurationMinutes,
      state.goldenTimeDurationMinutes,
      MIN_GOLDEN_TIME_DURATION_MINUTES,
      MAX_GOLDEN_TIME_DURATION_MINUTES,
    ),
  };

  if (
    nextState.priceUpdateIntervalMinutes === state.priceUpdateIntervalMinutes &&
    nextState.goldenTimeDurationMinutes === state.goldenTimeDurationMinutes
  ) {
    return state;
  }

  return commitState(nextState, now);
}

export function generateNewPricesForBoard(rawState, now = Date.now()) {
  const state = ensureInitialPrices(rawState, now);
  const generated = generateNewPrices(state.prices, state.lastMinimumUse, now);

  return commitState(
    {
      ...state,
      prices: generated.prices,
      lastMinimumUse: generated.lastMinimumUse,
      nextUpdateAt: now + getPriceUpdateIntervalMs(state),
    },
    now,
  );
}

export function scheduleGoldenTime(rawState, now = Date.now()) {
  const state = normalizeMarketState(rawState);

  if (!state.isActive || state.isGoldenTime || state.scheduledGoldenAt) {
    return state;
  }

  const startsAt =
    state.nextUpdateAt && state.nextUpdateAt > now
      ? state.nextUpdateAt
      : now + getPriceUpdateIntervalMs(state);

  return commitState(
    {
      ...state,
      scheduledGoldenAt: startsAt,
    },
    now,
  );
}

export function activateGoldenTime(rawState, now = Date.now()) {
  const state = ensureInitialPrices(rawState, now);

  if (!state.isActive || state.isGoldenTime) {
    return state;
  }

  return commitState(
    {
      ...state,
      isGoldenTime: true,
      prices: setAllPricesToGoldenTime(state.prices, now),
      goldenEndsAt: now + getGoldenTimeDurationMs(state),
      scheduledGoldenAt: null,
      preGoldenPrices: state.prices,
    },
    now,
  );
}

export function deactivateGoldenTime(rawState, now = Date.now()) {
  const state = normalizeMarketState(rawState);

  if (!state.isGoldenTime) {
    return state;
  }

  const generated = generateNewPrices(
    state.preGoldenPrices || state.prices,
    state.lastMinimumUse,
    now,
  );

  return commitState(
    {
      ...state,
      isGoldenTime: false,
      prices: generated.prices,
      lastMinimumUse: generated.lastMinimumUse,
      goldenEndsAt: null,
      scheduledGoldenAt: null,
      preGoldenPrices: null,
      nextUpdateAt: state.isActive ? now + getPriceUpdateIntervalMs(state) : null,
    },
    now,
  );
}

export function advanceMarketState(rawState, now = Date.now()) {
  const state = ensureInitialPrices(rawState, now);

  if (state.isGoldenTime && state.goldenEndsAt && state.goldenEndsAt <= now) {
    return deactivateGoldenTime(state, now);
  }

  if (
    state.isActive &&
    !state.isGoldenTime &&
    state.scheduledGoldenAt &&
    state.scheduledGoldenAt <= now
  ) {
    return activateGoldenTime(state, now);
  }

  if (state.isActive && !state.isGoldenTime && state.nextUpdateAt && state.nextUpdateAt <= now) {
    return generateNewPricesForBoard(state, now);
  }

  return state;
}

export function initializeMarketState(rawState = {}, now = Date.now()) {
  return advanceMarketState(rawState, now);
}

export function applyMarketAction(rawState, action, payload = {}, now = Date.now()) {
  const state = advanceMarketState(rawState, now);

  switch (action) {
    case "start-system":
      return startMarketSystem(state, now);
    case "stop-system":
      return stopMarketSystem(state, now);
    case "schedule-golden-time":
      return scheduleGoldenTime(state, now);
    case "update-settings":
      return updateMarketSettings(state, payload, now);
    default:
      return state;
  }
}
