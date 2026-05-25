export const DRINK_CATEGORIES = [
  {
    category: "Ginebra",
    items: ["Larios 12", "Seagrams", "Beefeater", "Tanqueray", "Puerto de Indias"],
  },
  {
    category: "Ron",
    items: ["Barceló", "Brugal", "Santa Teresa", "Cacique"],
  },
  {
    category: "Whisky",
    items: ["Red Label", "Ballantines 10", "J&B", "DYC 8"],
  },
  {
    category: "Vodka",
    items: ["Absolut"],
  },
];

export const POPULAR_DRINKS = [
  "Seagrams",
  "Beefeater",
  "Barceló",
  "Brugal",
  "Red Label",
  "Ballantines 10",
];

export function getAllDrinkNames() {
  return DRINK_CATEGORIES.flatMap((category) => category.items);
}
