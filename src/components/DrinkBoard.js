import { DRINK_CATEGORIES } from "../data/drinks.js";
import { renderDrinkCategory } from "./DrinkCategory.js";

const ARCADE_CATEGORY_COLUMNS = [
  ["Ron", "Ginebra"],
  ["Whisky", "Vodka"],
];

export function renderDrinkBoard({ prices, isGoldenTime }) {
  const categoriesByName = new Map(
    DRINK_CATEGORIES.map((category) => [category.category, category]),
  );

  return `
    <section class="drink-board" aria-label="Precios actuales por categoría">
      ${ARCADE_CATEGORY_COLUMNS.map((column) => `
        <div class="arcade-board-column">
          ${column
            .map((categoryName) => categoriesByName.get(categoryName))
            .filter(Boolean)
            .map((category) => renderDrinkCategory(category, prices, isGoldenTime))
            .join("")}
        </div>
      `).join("")}
    </section>
  `;
}
