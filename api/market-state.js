import {
  applyMarketAction,
  initializeMarketState,
} from "../src/utils/marketStateCore.js";

const GLOBAL_STATE_KEY = "__newPasaTMarketState";

function getSharedState() {
  const currentState = globalThis[GLOBAL_STATE_KEY];

  if (currentState) {
    return currentState;
  }

  globalThis[GLOBAL_STATE_KEY] = initializeMarketState({}, Date.now());
  return globalThis[GLOBAL_STATE_KEY];
}

function setSharedState(nextState) {
  globalThis[GLOBAL_STATE_KEY] = nextState;
  return nextState;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return request.body ? JSON.parse(request.body) : {};
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  return rawBody ? JSON.parse(rawBody) : {};
}

export async function handleMarketStateRequest(request, response) {
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method === "GET") {
    const nextState = setSharedState(initializeMarketState(getSharedState(), Date.now()));
    sendJson(response, 200, { state: nextState });
    return;
  }

  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const nextState = setSharedState(
        applyMarketAction(getSharedState(), body.action, body.payload, Date.now()),
      );

      sendJson(response, 200, { state: nextState });
    } catch (error) {
      sendJson(response, 400, {
        error: "invalid_request",
        message: error instanceof Error ? error.message : "No se pudo leer la accion.",
      });
    }

    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

export default handleMarketStateRequest;
