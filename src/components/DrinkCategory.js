import { renderDrinkCard } from "./DrinkCard.js";
import { escapeHtml } from "../utils/html.js";

export function renderDrinkCategory(category, prices, isGoldenTime) {
  return `
    <section class="drink-category">
      <div class="category-heading">
        <h2>${escapeHtml(category.category)}</h2>
      </div>

      <div class="drink-list">
        ${category.items
          .map((drinkName) => renderDrinkCard(drinkName, prices[drinkName], isGoldenTime))
          .join("")}
      </div>
    </section>
  `;
}
