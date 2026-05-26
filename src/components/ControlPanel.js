import { renderFullscreenButton } from "./FullscreenButton.js";
import {
  MAX_GOLDEN_TIME_DURATION_MINUTES,
  MAX_PRICE_UPDATE_INTERVAL_MINUTES,
  MIN_GOLDEN_TIME_DURATION_MINUTES,
  MIN_PRICE_UPDATE_INTERVAL_MINUTES,
} from "../data/prices.js";
import { escapeHtml } from "../utils/html.js";

function renderMinuteControl({
  label,
  setting,
  value,
  min,
  max,
  disabled,
}) {
  const disabledAttribute = disabled ? "disabled" : "";

  return `
    <label class="minute-control">
      <span>${escapeHtml(label)}</span>
      <div class="minute-stepper">
        <button
          class="minute-step-button"
          type="button"
          data-action="adjust-setting"
          data-setting="${escapeHtml(setting)}"
          data-step="-1"
          ${disabledAttribute}
        >-</button>
        <input
          class="minute-input"
          type="number"
          inputmode="numeric"
          min="${min}"
          max="${max}"
          step="1"
          value="${Number(value)}"
          data-setting-input="${escapeHtml(setting)}"
          ${disabledAttribute}
        />
        <button
          class="minute-step-button"
          type="button"
          data-action="adjust-setting"
          data-setting="${escapeHtml(setting)}"
          data-step="1"
          ${disabledAttribute}
        >+</button>
      </div>
    </label>
  `;
}

export function renderControlPanel({
  isActive,
  isGoldenTime,
  isGoldenScheduled,
  isFullscreenActive,
  priceUpdateIntervalMinutes,
  goldenTimeDurationMinutes,
  syncStatus,
}) {
  const systemLabel = isActive ? "DETENER" : "INICIAR";
  const systemClass = isActive ? "danger" : "primary";
  const goldenDisabled = !isActive || isGoldenTime || isGoldenScheduled ? "disabled" : "";
  const goldenLabel = isGoldenScheduled ? "Golden programado" : "Activar Golden Time";
  const settingsDisabled = isActive ? "disabled" : "";
  const syncLabel = syncStatus === "shared" ? "Movil sincronizado" : "Modo local";

  return `
    <section class="control-panel" aria-label="Controles del camarero">
      <button class="control-button ${systemClass}" type="button" data-action="toggle-system">
        <span class="icon" aria-hidden="true">${isActive ? "■" : "▶"}</span>
        <span>${systemLabel}</span>
      </button>

      <button class="control-button golden" type="button" data-action="golden-time" ${goldenDisabled}>
        <span class="icon" aria-hidden="true">★</span>
        <span>${goldenLabel}</span>
      </button>

      ${renderFullscreenButton(isFullscreenActive)}

      <div class="minute-controls" aria-label="Duraciones configurables">
        ${renderMinuteControl({
          label: "Cambio precios",
          setting: "priceUpdateIntervalMinutes",
          value: priceUpdateIntervalMinutes,
          min: MIN_PRICE_UPDATE_INTERVAL_MINUTES,
          max: MAX_PRICE_UPDATE_INTERVAL_MINUTES,
          disabled: Boolean(settingsDisabled),
        })}
        ${renderMinuteControl({
          label: "Golden Time",
          setting: "goldenTimeDurationMinutes",
          value: goldenTimeDurationMinutes,
          min: MIN_GOLDEN_TIME_DURATION_MINUTES,
          max: MAX_GOLDEN_TIME_DURATION_MINUTES,
          disabled: Boolean(settingsDisabled),
        })}
        <span class="sync-pill sync-${escapeHtml(syncStatus || "local")}">${syncLabel}</span>
      </div>
    </section>
  `;
}
