import { escapeHtml } from "../utils/html.js";

export function renderCountdown({ label, value, detail = "", tone = "default" }) {
  return `
    <div class="countdown countdown-${escapeHtml(tone)}">
      <span class="countdown-label">${escapeHtml(label)}</span>
      <strong class="countdown-value">${escapeHtml(value)}</strong>
      ${detail ? `<span class="countdown-detail">${escapeHtml(detail)}</span>` : ""}
    </div>
  `;
}
