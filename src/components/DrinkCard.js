import { formatPrice } from "../utils/formatPrice.js";
import { escapeHtml } from "../utils/html.js";
import { getPriceMovement } from "../utils/priceEngine.js";

const MOVEMENT_META = {
  up: {
    label: "Sube",
    symbol: "▲",
  },
  down: {
    label: "Baja",
    symbol: "▼",
  },
  same: {
    label: "Estable",
    symbol: "●",
  },
};

export function renderDrinkCard(drinkName, priceRecord, isGoldenTime) {
  const currentPrice = priceRecord?.current;
  const previousPrice = priceRecord?.previous;
  const movement = isGoldenTime ? "same" : getPriceMovement(previousPrice, currentPrice);
  const movementMeta = MOVEMENT_META[movement];

  return `
    <article class="drink-row movement-${movement} ${isGoldenTime ? "golden-price" : ""}">
      <h3 class="drink-name">${escapeHtml(drinkName)}</h3>

      <div class="price-stack">
        <strong class="drink-price">${formatPrice(currentPrice)}</strong>
      </div>

      <div class="movement-badge" aria-label="${escapeHtml(movementMeta.label)}">
        <span aria-hidden="true">${movementMeta.symbol}</span>
      </div>
    </article>
  `;
}
