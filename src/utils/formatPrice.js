export function formatPrice(price) {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "--,-- €";
  }

  return `${price.toFixed(2).replace(".", ",")} €`;
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
