import { renderCountdown } from "./Countdown.js";
import { escapeHtml } from "../utils/html.js";

export function renderHeader({
  isActive,
  isGoldenTime,
  nextUpdateLabel,
  goldenStatusLabel,
  scheduledGoldenLabel,
}) {
  const statusLabel = isGoldenTime ? "Golden Time activo" : isActive ? "Mercado activo" : "Mercado inactivo";
  const statusClass = isGoldenTime ? "golden" : isActive ? "live" : "idle";

  return `
    <header class="market-header">
      <a class="brand-lockup" href="/index.html" aria-label="Volver al inicio">
        <span class="logo-fx logo-fx-lockup">
          <img class="brand-logo small" src="/public/logo-clean.png" alt="NEW PASA-T" />
        </span>
        <div>
          <p class="eyebrow">NEW PASA-T</p>
          <h1>Mercado de bebidas</h1>
        </div>
      </a>

      <div class="market-status">
        <span class="status-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
        <span class="status-pill warm">${escapeHtml(goldenStatusLabel)}</span>
        <span class="status-pill muted">${escapeHtml(scheduledGoldenLabel)}</span>
      </div>

      <div class="header-countdowns">
        ${renderCountdown({
          label: "Próxima actualización",
          value: nextUpdateLabel,
          detail: isActive && !isGoldenTime ? "ciclo de 10 minutos" : "en espera",
          tone: isGoldenTime ? "paused" : isActive ? "active" : "idle",
        })}
      </div>
    </header>
  `;
}
