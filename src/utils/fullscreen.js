export async function enterFullscreen(element = document.documentElement) {
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  }

  if (element.webkitRequestFullscreen) {
    return element.webkitRequestFullscreen();
  }

  return Promise.resolve();
}

export async function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }

  if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  }

  return Promise.resolve();
}

export async function toggleFullscreen(element = document.documentElement) {
  if (isFullscreen()) {
    return exitFullscreen();
  }

  return enterFullscreen(element);
}

export function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}
