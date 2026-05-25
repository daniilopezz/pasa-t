import { getAllDrinkNames, POPULAR_DRINKS } from "../data/drinks.js";
import {
  ALLOWED_PRICES,
  GOLDEN_TIME_PRICE,
  POPULAR_MINIMUM_COOLDOWN_MS,
  WEIGHTED_PRICE_TABLE,
  WEIGHTED_PRICE_TABLE_WITHOUT_MINIMUM,
} from "../data/prices.js";

export function generateWeightedPrice(priceTable = WEIGHTED_PRICE_TABLE) {
  const totalWeight = priceTable.reduce((total, entry) => total + entry.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const entry of priceTable) {
    cursor -= entry.weight;

    if (cursor <= 0) {
      return entry.price;
    }
  }

  return priceTable.at(-1).price;
}

export function canPopularDrinkUseMinimumPrice(drinkName, lastMinimumUse = {}, now = Date.now()) {
  if (!POPULAR_DRINKS.includes(drinkName)) {
    return true;
  }

  const lastUse = Number(lastMinimumUse[drinkName] || 0);
  return !lastUse || now - lastUse >= POPULAR_MINIMUM_COOLDOWN_MS;
}

export function generatePriceForDrink(drinkName, lastMinimumUse = {}, now = Date.now()) {
  let price = generateWeightedPrice();
  const nextMinimumUse = { ...lastMinimumUse };

  if (POPULAR_DRINKS.includes(drinkName) && price === 4.5) {
    if (canPopularDrinkUseMinimumPrice(drinkName, lastMinimumUse, now)) {
      nextMinimumUse[drinkName] = now;
    } else {
      price = generateWeightedPrice(WEIGHTED_PRICE_TABLE_WITHOUT_MINIMUM);
    }
  }

  if (!ALLOWED_PRICES.includes(price)) {
    price = GOLDEN_TIME_PRICE;
  }

  return {
    price,
    lastMinimumUse: nextMinimumUse,
  };
}

export function generateNewPrices(currentPrices = {}, lastMinimumUse = {}, now = Date.now()) {
  let minimumUseCursor = { ...lastMinimumUse };
  const nextPrices = {};

  for (const drinkName of getAllDrinkNames()) {
    const previousRecord = currentPrices[drinkName];
    const previousPrice =
      typeof previousRecord?.current === "number" ? previousRecord.current : null;
    const generated = generatePriceForDrink(drinkName, minimumUseCursor, now);

    minimumUseCursor = generated.lastMinimumUse;
    nextPrices[drinkName] = {
      current: generated.price,
      previous: previousPrice,
      updatedAt: now,
    };
  }

  return {
    prices: nextPrices,
    lastMinimumUse: minimumUseCursor,
  };
}

export function setAllPricesToGoldenTime(currentPrices = {}, now = Date.now()) {
  const goldenPrices = {};

  for (const drinkName of getAllDrinkNames()) {
    const previousRecord = currentPrices[drinkName];
    goldenPrices[drinkName] = {
      current: GOLDEN_TIME_PRICE,
      previous: typeof previousRecord?.current === "number" ? previousRecord.current : null,
      updatedAt: now,
    };
  }

  return goldenPrices;
}

export function getPriceMovement(previousPrice, currentPrice) {
  if (typeof previousPrice !== "number" || typeof currentPrice !== "number") {
    return "same";
  }

  if (currentPrice > previousPrice) {
    return "up";
  }

  if (currentPrice < previousPrice) {
    return "down";
  }

  return "same";
}
