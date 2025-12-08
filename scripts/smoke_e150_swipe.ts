const base = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const feedPath = "/api/swipeStatements";

async function main() {
  let exitCode = 0;

  try {
    const res = await fetch(`${base}${feedPath}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok || data === null) {
      console.error(
        `[SMOKE][swipe] failed: status=${res.status} body=${JSON.stringify(
          data,
        )}`,
      );
      exitCode = 1;
    } else if (Array.isArray(data) && data.length === 0) {
      console.log("[SMOKE][swipe] feed reachable, but no items.");
    } else if (Array.isArray(data) || (data && typeof data === "object")) {
      const count = Array.isArray(data)
        ? data.length
        : Array.isArray(data.items)
          ? data.items.length
          : "unknown";
      console.log(`[SMOKE][swipe] ok: items=${count}`);
    } else {
      console.error(
        `[SMOKE][swipe] unexpected response shape: ${JSON.stringify(data)}`,
      );
      exitCode = 1;
    }
  } catch (err) {
    console.error("[SMOKE][swipe] network error", err);
    exitCode = 1;
  }

  process.exit(exitCode);
}

main();

