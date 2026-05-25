export const ALLOWED_PRICES = [4.5, 5, 5.2, 5.5, 5.7, 6, 6.5, 7, 7.5, 8];

export const PRICE_UPDATE_INTERVAL_MS = 10 * 60 * 1000;
export const GOLDEN_TIME_DURATION_MS = 5 * 60 * 1000;
export const POPULAR_MINIMUM_COOLDOWN_MS = 60 * 60 * 1000;
export const GOLDEN_TIME_PRICE = 5;

export const WEIGHTED_PRICE_TABLE = [
  { price: 4.5, weight: 2 },
  { price: 5, weight: 7 },
  { price: 5.2, weight: 8 },
  { price: 5.5, weight: 18 },
  { price: 5.7, weight: 18 },
  { price: 6, weight: 20 },
  { price: 6.5, weight: 18 },
  { price: 7, weight: 7 },
  { price: 7.5, weight: 2 },
  { price: 8, weight: 1 },
];

export const WEIGHTED_PRICE_TABLE_WITHOUT_MINIMUM = WEIGHTED_PRICE_TABLE.filter(
  (entry) => entry.price !== 4.5,
);
