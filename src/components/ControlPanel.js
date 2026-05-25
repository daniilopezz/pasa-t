import { renderFullscreenButton } from "./FullscreenButton.js";

export function renderControlPanel({ isActive, isGoldenTime, isGoldenScheduled, isFullscreenActive }) {
  const systemLabel = isActive ? "DETENER" : "INICIAR";
  const systemClass = isActive ? "danger" : "primary";
  const goldenDisabled = !isActive || isGoldenTime || isGoldenScheduled ? "disabled" : "";
  const goldenLabel = isGoldenScheduled ? "Golden programado" : "Activar Golden Time";

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
    </section>
  `;
}
