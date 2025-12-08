const base = process.env.WEB_BASE_URL ?? "http://localhost:3000";

type AnalyzeResponse = {
  ok?: boolean;
  result?: any;
  errorCode?: string;
  message?: string;
};

async function callAnalyze(body: any, label: string) {
  const res = await fetch(`${base}/api/contributions/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: AnalyzeResponse | null = null;
  try {
    data = (await res.json()) as AnalyzeResponse;
  } catch {
    data = null;
  }

  return { res, data };
}

async function runPingTest(): Promise<boolean> {
  const { res, data } = await callAnalyze({ test: "ping" }, "ping");
  const ok =
    res.status === 200 &&
    data?.ok === true &&
    data?.result &&
    data.result.ping === "pong";

  if (!ok) {
    console.error(
      `[SMOKE][analyze][ping] failed: status=${res.status} body=${JSON.stringify(
        data,
      )}`,
    );
  } else {
    console.log("[SMOKE][analyze][ping] ok");
  }
  return ok;
}

async function runBadInputTest(): Promise<boolean> {
  const { res, data } = await callAnalyze({ text: "", locale: "de" }, "bad_input");
  const ok =
    res.status === 400 &&
    data?.ok === false &&
    (data.errorCode === "BAD_INPUT" || data.errorCode === "INVALID_JSON");

  if (!ok) {
    console.error(
      `[SMOKE][analyze][bad_input] failed: status=${res.status} body=${JSON.stringify(
        data,
      )}`,
    );
  } else {
    console.log("[SMOKE][analyze][bad_input] ok");
  }
  return ok;
}

async function runFullTest(): Promise<void> {
  const body = { text: "Gegen Tierversuche", locale: "de", maxClaims: 5 };
  const { res, data } = await callAnalyze(body, "full");

  if (!res.ok || !data?.ok) {
    console.log(
      `[SMOKE][analyze][full] degraded: status=${res.status} errorCode=${
        data?.errorCode ?? "n/a"
      } message=${data?.message ?? "n/a"}`,
    );
    return;
  }

  const claims = data?.result?.claims;
  if (!Array.isArray(claims) || claims.length < 1) {
    console.log(
      `[SMOKE][analyze][full] degraded: claims missing or empty (len=${Array.isArray(
        claims,
      )
        ? claims.length
        : "n/a"})`,
    );
    return;
  }

  console.log(
    `[SMOKE][analyze][full] ok: received ${claims.length} claim(s).`,
  );
}

async function main() {
  let failures = 0;
  const pingOk = await runPingTest();
  if (!pingOk) failures++;

  const badInputOk = await runBadInputTest();
  if (!badInputOk) failures++;

  if (process.env.E150_SMOKE_FULL === "1") {
    await runFullTest();
  } else {
    console.log("[SMOKE][analyze][full] skipped (set E150_SMOKE_FULL=1 to run).");
  }

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error("[SMOKE][analyze] unexpected error", err);
  process.exit(1);
});

