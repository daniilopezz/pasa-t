export function renderFullscreenButton(isFullscreenActive) {
  const label = isFullscreenActive ? "Salir pantalla completa" : "Pantalla completa";

  return `
    <button class="control-button ghost icon-button" type="button" data-action="fullscreen">
      <span class="icon" aria-hidden="true">${isFullscreenActive ? "⤢" : "⛶"}</span>
      <span>${label}</span>
    </button>
  `;
}
