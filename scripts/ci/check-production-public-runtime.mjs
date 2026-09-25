#!/usr/bin/env node
import http from "node:http";
import https from "node:https";

const BASE_URL = "https://www.edebatte.org";
const PATHS = [
  "/",
  "/themen",
  "/dossier",
  "/create",
  "/pricing/institutionen",
  "/order",
  "/anlassraum/digitalisierung-politik",
  "/api/public-ballots/digital-politics/vote",
];
const FORBIDDEN_MARKERS = [
  "CriticalProductionWebRuntimeEnvError",
  "web_database_url_missing",
];
const MAX_REDIRECTS = 10;
const MAX_RETRIES = 3;
const CONNECT_TIMEOUT_MS = 5_000;
const TOTAL_TIMEOUT_MS = 15_000;

function createTypedError(type, statusCode) {
  const error = new Error(type);
  error.name = type;
  error.type = type;
  error.statusCode = statusCode ?? null;
  return error;
}

function normalizeLocation(location, currentUrl) {
  try {
    return new URL(location, currentUrl);
  } catch {
    throw createTypedError("INVALID_REDIRECT");
  }
}

function readResponseBody(response) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    response.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    response.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    response.on("error", (error) => {
      reject(createTypedError(error?.type || "RESPONSE_ERROR"));
    });
  });
}

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    let settled = false;
    let connectTimer = null;
    let totalTimer = null;

    const finalize = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(totalTimer);
      callback();
    };

    const request = transport.request(
      url,
      {
        method: "GET",
        headers: {
          "user-agent": "edebatte-production-live-smoke/1.0",
          accept: "text/html,application/xhtml+xml,application/json",
        },
      },
      async (response) => {
        clearTimeout(connectTimer);

        const statusCode = response.statusCode ?? 0;
        const locationHeader = response.headers.location;

        if (
          locationHeader &&
          [301, 302, 303, 307, 308].includes(statusCode)
        ) {
          response.resume();
          finalize(() =>
            resolve({
              statusCode,
              redirectUrl: normalizeLocation(locationHeader, url),
              body: "",
            }),
          );
          return;
        }

        try {
          const body = await readResponseBody(response);
          finalize(() =>
            resolve({
              statusCode,
              redirectUrl: null,
              body,
            }),
          );
        } catch (error) {
          finalize(() => reject(error));
        }
      },
    );

    request.on("socket", (socket) => {
      if (!socket.connecting) {
        return;
      }

      connectTimer = setTimeout(() => {
        request.destroy(createTypedError("CONNECT_TIMEOUT"));
      }, CONNECT_TIMEOUT_MS);

      const clearConnectTimer = () => {
        clearTimeout(connectTimer);
      };

      socket.once("connect", clearConnectTimer);
      socket.once("secureConnect", clearConnectTimer);
    });

    totalTimer = setTimeout(() => {
      request.destroy(createTypedError("TOTAL_TIMEOUT"));
    }, TOTAL_TIMEOUT_MS);

    request.on("error", (error) => {
      const statusCode =
        typeof error?.statusCode === "number" ? error.statusCode : null;
      const type =
        error?.type ||
        (error?.name === "Error" && error?.message
          ? "NETWORK_ERROR"
          : error?.name || "NETWORK_ERROR");

      finalize(() => reject(createTypedError(type, statusCode)));
    });

    request.end();
  });
}

async function fetchWithRedirects(pathname) {
  let currentUrl = new URL(pathname, BASE_URL);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const result = await requestOnce(currentUrl);

    if (!result.redirectUrl) {
      return result;
    }

    currentUrl = result.redirectUrl;
  }

  throw createTypedError("TOO_MANY_REDIRECTS");
}

function bodyContainsForbiddenMarker(body) {
  return FORBIDDEN_MARKERS.some((marker) => body.includes(marker));
}

async function checkPath(pathname) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await fetchWithRedirects(pathname);

      if (result.statusCode !== 200) {
        throw createTypedError("HTTP_STATUS", result.statusCode);
      }

      if (bodyContainsForbiddenMarker(result.body)) {
        throw createTypedError("FORBIDDEN_BODY_MARKER", result.statusCode);
      }

      return {
        ok: true,
        pathname,
        statusCode: result.statusCode,
        errorType: null,
      };
    } catch (error) {
      lastError = {
        ok: false,
        pathname,
        statusCode:
          typeof error?.statusCode === "number" ? error.statusCode : "n/a",
        errorType: error?.type || error?.name || "UNKNOWN_ERROR",
      };
    }
  }

  return lastError;
}

async function main() {
  const results = [];

  for (const pathname of PATHS) {
    results.push(await checkPath(pathname));
  }

  const failures = results.filter((result) => !result.ok);

  if (failures.length > 0) {
    console.error("[production-public-runtime] FAIL");
    for (const failure of failures) {
      console.error(
        `- path=${failure.pathname} status=${failure.statusCode} error=${failure.errorType}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `[production-public-runtime] PASS ${PATHS.length} paths on ${BASE_URL}`,
  );
}

main().catch((error) => {
  const errorType = error?.type || error?.name || "UNKNOWN_ERROR";
  console.error("[production-public-runtime] FAIL");
  console.error(`- path=workflow status=n/a error=${errorType}`);
  process.exit(1);
});
