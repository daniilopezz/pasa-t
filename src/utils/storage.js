export function loadState(storageKey, fallbackState) {
  try {
    const rawState = window.localStorage.getItem(storageKey);

    if (!rawState) {
      return fallbackState;
    }

    return {
      ...fallbackState,
      ...JSON.parse(rawState),
    };
  } catch (error) {
    console.warn("No se pudo recuperar el estado guardado", error);
    return fallbackState;
  }
}

export function saveState(storageKey, state) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar el estado del mercado", error);
  }
}
