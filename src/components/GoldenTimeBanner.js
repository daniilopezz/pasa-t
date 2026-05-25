import { formatTime } from "../utils/formatPrice.js";

export function renderGoldenTimeBanner({ isGoldenTime, remainingSeconds }) {
  if (!isGoldenTime) {
    return "";
  }

  return `
    <section class="golden-banner" role="status" aria-live="polite">
      <div class="golden-sheen" aria-hidden="true"></div>
      <p>GOLDEN TIME</p>
      <strong>Todas las bebidas a 5,00 €</strong>
      <span>Termina en ${formatTime(remainingSeconds)}</span>
    </section>
  `;
}
