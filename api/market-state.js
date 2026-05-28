import {
  applyMarketAction,
  initializeMarketState,
  normalizeMarketState,
} from "../src/utils/marketStateCore.js";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GLOBAL_STATE_KEY = "__newPasaTMarketState";
const REDIS_STATE_KEY =
  process.env.PASA_T_MARKET_STATE_KEY || "new-pasa-t:market-state:v1";
const REDIS_LOCK_KEY = `${REDIS_STATE_KEY}:lock`;
const STATE_FILE_PATH = fileURLToPath(
  new URL("../.data/market-state.json", import.meta.url),
);
const REDIS_LOCK_TTL_MS = 5000;
const REDIS_LOCK_WAIT_MS = 5000;
const REDIS_LOCK_RETRY_MS = 80;
const IS_VERCEL = process.env.VERCEL === "1";

let stateQueue = Promise.resolve();
let fileStorageAvailable = true;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRedisConfig() {
  const rawUrl =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const url = rawUrl?.replace(/\/+$/, "");

  return url && token ? { url, token } : null;
}

function hasDurableRedisStorage() {
  return Boolean(getRedisConfig());
}

function isStorageConfigured() {
  return hasDurableRedisStorage() || !IS_VERCEL;
}

async function redisCommand(args, { method = "POST", body } = {}) {
  const config = getRedisConfig();

  if (!config) {
    throw new Error("Upstash Redis no esta configurado.");
  }

  const commandPath = args.map((part) => encodeURIComponent(String(part))).join("/");
  const response = await fetch(`${config.url}/${commandPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...(body ? { "Content-Type": "text/plain; charset=utf-8" } : {}),
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (payload?.error) {
    throw new Error(String(payload.error));
  }

  return payload?.result ?? null;
}

async function readStateFromRedis() {
  const rawState = await redisCommand(["get", REDIS_STATE_KEY], { method: "GET" });

  if (!rawState) {
    return null;
  }

  return normalizeMarketState(
    typeof rawState === "string" ? JSON.parse(rawState) : rawState,
  );
}

async function writeStateToRedis(state) {
  await redisCommand(["set", REDIS_STATE_KEY], {
    body: JSON.stringify(state),
  });
}

async function acquireRedisLock() {
  if (!hasDurableRedisStorage()) {
    return () => {};
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + REDIS_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    const result = await redisCommand([
      "set",
      REDIS_LOCK_KEY,
      token,
      "NX",
      "PX",
      REDIS_LOCK_TTL_MS,
    ]);

    if (result === "OK") {
      return async () => {
        const currentToken = await redisCommand(["get", REDIS_LOCK_KEY], {
          method: "GET",
        });

        if (currentToken === token) {
          await redisCommand(["del", REDIS_LOCK_KEY]);
        }
      };
    }

    await sleep(REDIS_LOCK_RETRY_MS);
  }

  throw new Error("No se pudo bloquear el estado compartido.");
}

function isStateNewer(candidateState, currentState) {
  const candidate = normalizeMarketState(candidateState);
  const current = normalizeMarketState(currentState);

  if (candidate.updatedAt && current.updatedAt) {
    return candidate.updatedAt > current.updatedAt;
  }

  return candidate.revision > current.revision;
}

function runExclusive(operation) {
  const nextOperation = stateQueue.then(async () => {
    const releaseLock = await acquireRedisLock();

    try {
      return await operation();
    } finally {
      try {
        await releaseLock();
      } catch {
        // La caducidad del lock evita bloqueos permanentes si la liberacion falla.
      }
    }
  }, async () => {
    const releaseLock = await acquireRedisLock();

    try {
      return await operation();
    } finally {
      try {
        await releaseLock();
      } catch {
        // La caducidad del lock evita bloqueos permanentes si la liberacion falla.
      }
    }
  });

  stateQueue = nextOperation.catch(() => {});
  return nextOperation;
}

async function readStateFromFile() {
  if (!fileStorageAvailable || IS_VERCEL) {
    return null;
  }

  try {
    const rawState = await readFile(STATE_FILE_PATH, "utf8");
    return normalizeMarketState(JSON.parse(rawState));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    fileStorageAvailable = false;
    return null;
  }
}

async function writeStateToFile(state) {
  if (!fileStorageAvailable || IS_VERCEL) {
    return;
  }

  try {
    await mkdir(dirname(STATE_FILE_PATH), { recursive: true });
    const temporaryPath = `${STATE_FILE_PATH}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8");
    await rename(temporaryPath, STATE_FILE_PATH);
  } catch {
    fileStorageAvailable = false;
  }
}

async function getSharedState(now = Date.now()) {
  if (hasDurableRedisStorage()) {
    const redisState = await readStateFromRedis();

    if (redisState) {
      globalThis[GLOBAL_STATE_KEY] = redisState;
      return redisState;
    }
  }

  const persistedState = await readStateFromFile();

  if (persistedState) {
    globalThis[GLOBAL_STATE_KEY] = persistedState;
    return persistedState;
  }

  const currentState = globalThis[GLOBAL_STATE_KEY];

  if (currentState) {
    return currentState;
  }

  globalThis[GLOBAL_STATE_KEY] = initializeMarketState({}, now);
  return globalThis[GLOBAL_STATE_KEY];
}

async function setSharedState(nextState) {
  globalThis[GLOBAL_STATE_KEY] = nextState;

  if (hasDurableRedisStorage()) {
    await writeStateToRedis(nextState);
  } else {
    await writeStateToFile(nextState);
  }

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

  if (!isStorageConfigured()) {
    sendJson(response, 503, {
      error: "sync_storage_not_configured",
      message:
        "Configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN para sincronizar en Vercel.",
    });
    return;
  }

  if (request.method === "GET") {
    const { state, serverNow } = await runExclusive(async () => {
      const now = Date.now();
      const nextState = await setSharedState(
        initializeMarketState(await getSharedState(now), now),
      );

      return { state: nextState, serverNow: now };
    });

    sendJson(response, 200, { state, serverNow });
    return;
  }

  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const { state, serverNow } = await runExclusive(async () => {
        const now = Date.now();
        const currentState = initializeMarketState(await getSharedState(now), now);
        const nextState =
          body.action === "replace-state" && body.state
            ? isStateNewer(body.state, currentState)
              ? initializeMarketState(body.state, now)
              : currentState
            : applyMarketAction(currentState, body.action, body.payload, now);

        return {
          state: await setSharedState(nextState),
          serverNow: now,
        };
      });

      sendJson(response, 200, { state, serverNow });
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
