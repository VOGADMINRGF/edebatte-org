import { NextRequest, NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/db/triMongo";
import { sendMail } from "@/utils/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TEXT_LENGTH = 20;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

const READ_TOKEN = process.env.CONTRIB_READ_TOKEN;
const WRITE_TOKEN = process.env.CONTRIB_WRITE_TOKEN ?? READ_TOKEN;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

function mapContribution(doc: any) {
  const text = doc.text ?? doc.content ?? "";
  const analysis = doc.analysis ?? {};
  return {
    id: String(doc._id),
    text,
    locale: doc.locale ?? doc.userContext?.locale ?? null,
    status: doc.status ?? null,
    reviewStatus: doc.reviewStatus ?? null,
    source: doc.source ?? null,
    attachments: doc.attachments ?? doc.media ?? [],
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    analysis: {
      topics: Array.isArray(analysis?.topics) ? analysis.topics : [],
      categories: Array.isArray(analysis?.keyPhrases) ? analysis.keyPhrases : [],
      status: analysis?.status ?? null,
      orchestrator: analysis?.orchestrator ?? null,
      lastRunAt: analysis?.lastRunAt ?? null,
      hasRaw: Boolean(analysis?.raw),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const provided =
        req.headers.get("x-write-token") ||
        req.headers.get("x-read-token") ||
        new URL(req.url).searchParams.get("token");
      if (WRITE_TOKEN && provided !== WRITE_TOKEN) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
      }

      const mode = (body as any).mode ?? (body as any).action;
      if (mode !== "bulk_update") {
        return NextResponse.json({ ok: false, error: "unsupported_action" }, { status: 400 });
      }

      const updates = Array.isArray((body as any).updates) ? (body as any).updates : [];
      if (updates.length === 0) {
        return NextResponse.json({ ok: false, error: "missing_updates" }, { status: 400 });
      }

      const col = await coreCol("contributions");
      const now = new Date();
      const results = await Promise.all(
        updates.map(async (update: any) => {
          const id = typeof update?.id === "string" ? update.id : null;
          if (!id) return null;
          let oid: ObjectId;
          try {
            oid = new ObjectId(id);
          } catch {
            return null;
          }
          const doc = await col.findOne({ _id: oid }).catch(() => null);
          if (!doc) return null;

          const topics = normalizeStringArray(update?.topics);
          const categories = normalizeStringArray(update?.categories);
          const patch: any = { updatedAt: now };
          if (update?.status !== undefined) patch.status = update.status;
          if (update?.reviewStatus !== undefined) patch.reviewStatus = update.reviewStatus;
          if (topics !== undefined) patch["analysis.topics"] = topics;
          if (categories !== undefined) patch["analysis.keyPhrases"] = categories;
          if (update?.analysisStatus !== undefined) patch["analysis.status"] = update.analysisStatus;

          const res = await col.findOneAndUpdate(
            { _id: doc._id },
            { $set: patch },
            { returnDocument: "after" },
          );
          const updated = (res as any)?.value ?? res;
          return updated ? mapContribution(updated) : null;
        }),
      );

      return NextResponse.json({ ok: true, items: results.filter(Boolean) });
    }

    const formData = await req.formData();

    const honey = getString(formData, "honey");
    if (honey) {
      return NextResponse.json({ ok: false, message: "Spam block." }, { status: 400 });
    }

    const text = getString(formData, "text");
    const locale = getString(formData, "locale");
    const role = getString(formData, "role");
    const level = getString(formData, "level");

    const humanA = Number(getString(formData, "humanA"));
    const humanB = Number(getString(formData, "humanB"));
    const humanAnswer = Number(getString(formData, "humanAnswer"));

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        { ok: false, message: "Bitte mindestens 20 Zeichen schreiben." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(humanA) || !Number.isFinite(humanB) || !Number.isFinite(humanAnswer)) {
      return NextResponse.json({ ok: false, message: "Human-Check ungültig." }, { status: 400 });
    }

    if (humanAnswer !== humanA + humanB) {
      return NextResponse.json({ ok: false, message: "Human-Check stimmt nicht." }, { status: 400 });
    }

    const fileEntries = [...formData.getAll("files"), ...formData.getAll("files[]")];
    const files = fileEntries.filter((entry): entry is File => entry instanceof File);
    const attachments = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    const now = new Date();
    const entry = {
      text,
      content: text,
      locale: locale || undefined,
      context: {
        role: role || undefined,
        level: level || undefined,
      },
      attachments,
      createdAt: now,
      updatedAt: now,
      status: "pending_review",
      reviewStatus: "pending",
      analysis: { status: "pending" },
      source: "landing_demo",
    };

    const col = await coreCol("contributions");
    const result = await col.insertOne(entry);

    const adminTo = process.env.MAIL_ADMIN_TO || "beitraege@edebatte.org";
    const preview = text.length > 600 ? `${text.slice(0, 600)}…` : text;
    const subject = "Neue Landing-Einreichung (pending_review)";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px 0;font-size:18px;">Neue Landing-Einreichung</h2>
        <p style="margin:0 0 10px 0;"><strong>ID:</strong> ${String(result.insertedId)}</p>
        <p style="margin:0 0 10px 0;"><strong>Locale:</strong> ${locale || "n/a"}</p>
        <p style="margin:0 0 10px 0;"><strong>Rolle:</strong> ${role || "n/a"} · <strong>Ebene:</strong> ${level || "n/a"}</p>
        <p style="margin:0 0 10px 0;"><strong>Dateien:</strong> ${attachments.length}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:14px 0;" />
        <p style="margin:0 0 8px 0;font-weight:600;">Text</p>
        <div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">${preview
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>
        <p style="margin:12px 0 0 0;font-size:12px;color:#64748b;">Quelle: landing_demo · Status: pending_review</p>
      </div>
    `;
    await sendMail({ to: adminTo, subject, html });

    return NextResponse.json({
      ok: true,
      contributionId: String(result.insertedId),
      status: "pending_review",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beitrag konnte nicht gespeichert werden.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = READ_TOKEN;
  const provided = url.searchParams.get("token") || req.headers.get("x-read-token");
  const format = url.searchParams.get("format");
  const accept = req.headers.get("accept") || "";

  if (token && provided !== token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = Math.min(Number(url.searchParams.get("limit") || DEFAULT_LIMIT), MAX_LIMIT);
  const skip = Math.max(Number(url.searchParams.get("skip") || 0), 0);
  const source = url.searchParams.get("source");
  const status = url.searchParams.get("status");
  const reviewStatus = url.searchParams.get("reviewStatus");
  const q = url.searchParams.get("q");
  const query: Record<string, any> = {};
  if (source) query.source = source;
  if (status) query.status = status;
  if (reviewStatus) query.reviewStatus = reviewStatus;
  if (q) query.$text = { $search: q };

  const col = await coreCol("contributions");
  const total = await col.countDocuments(query);
  const items = await col
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const data = items.map((doc: any) => mapContribution(doc));

  if (format === "table" || accept.includes("text/html")) {
    const rows = data
      .map(
        (row) => `
          <tr>
            <td>${row.id}</td>
            <td>${row.locale ?? ""}</td>
            <td>${row.status ?? ""}</td>
            <td>${row.reviewStatus ?? ""}</td>
            <td>${row.attachments?.length ?? 0}</td>
            <td>${row.createdAt ? new Date(row.createdAt).toLocaleString("de-DE") : ""}</td>
            <td>${String(row.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <!doctype html>
      <html lang="de">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>eDebatte · Beitragsübersicht</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');

            :root {
              color-scheme: light;
              --bg: #f6f3ee;
              --bg-2: #fef8f2;
              --ink: #101418;
              --muted: #6b7280;
              --card: rgba(255, 255, 255, 0.82);
              --line: rgba(148, 163, 184, 0.35);
              --accent: #ff6b4a;
              --accent-2: #0ea5a4;
              --shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
              --radius: 18px;
            }

            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: "IBM Plex Sans", "Space Grotesk", sans-serif;
              color: var(--ink);
              background: radial-gradient(circle at 20% 20%, #ffe7d6 0%, transparent 45%),
                          radial-gradient(circle at 80% 0%, #d9f5f1 0%, transparent 55%),
                          linear-gradient(160deg, var(--bg), var(--bg-2));
              min-height: 100vh;
            }

            .wrap {
              max-width: 1200px;
              margin: 0 auto;
              padding: 32px 20px 60px;
            }

            .hero {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 28px;
            }

            .hero h1 {
              font-family: "Space Grotesk", "IBM Plex Sans", sans-serif;
              font-size: clamp(28px, 4vw, 40px);
              margin: 6px 0 8px;
              letter-spacing: -0.02em;
            }

            .eyebrow {
              font-size: 12px;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              color: var(--accent-2);
              font-weight: 600;
            }

            .hero p {
              max-width: 520px;
              margin: 0;
              color: var(--muted);
              font-size: 14px;
            }

            .token-box {
              background: var(--card);
              backdrop-filter: blur(8px);
              border: 1px solid var(--line);
              border-radius: var(--radius);
              padding: 16px;
              min-width: 240px;
              box-shadow: var(--shadow);
            }

            .token-box label {
              font-size: 12px;
              font-weight: 600;
              color: var(--muted);
              display: block;
              margin-bottom: 8px;
            }

            .token-row {
              display: flex;
              gap: 8px;
            }

            .token-row input {
              flex: 1;
              border-radius: 999px;
              border: 1px solid var(--line);
              padding: 8px 12px;
              font-size: 13px;
              background: #fff;
            }

            .token-row button {
              border-radius: 999px;
              border: none;
              padding: 8px 14px;
              font-weight: 600;
              background: var(--accent);
              color: #fff;
              cursor: pointer;
            }

            .stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
              gap: 12px;
              margin-bottom: 22px;
            }

            .stat {
              background: var(--card);
              border-radius: 16px;
              padding: 14px 16px;
              border: 1px solid var(--line);
              box-shadow: var(--shadow);
            }

            .stat .label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--muted);
            }

            .stat .value {
              font-size: 22px;
              font-family: "Space Grotesk", sans-serif;
              margin-top: 4px;
            }

            .controls {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-bottom: 16px;
            }

            .controls input,
            .controls select {
              border-radius: 999px;
              border: 1px solid var(--line);
              padding: 9px 14px;
              font-size: 13px;
              background: #fff;
              min-width: 180px;
            }

            .controls button {
              border-radius: 999px;
              border: none;
              padding: 9px 16px;
              font-weight: 600;
              background: #101418;
              color: #fff;
              cursor: pointer;
            }

            .layout {
              display: grid;
              grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
              gap: 18px;
            }

            .panel {
              background: var(--card);
              border-radius: var(--radius);
              border: 1px solid var(--line);
              box-shadow: var(--shadow);
              padding: 16px;
            }

            .list {
              display: flex;
              flex-direction: column;
              gap: 10px;
              max-height: 70vh;
              overflow: auto;
            }

            .row {
              border-radius: 14px;
              padding: 12px 14px;
              border: 1px solid transparent;
              background: #fff;
              cursor: pointer;
              display: grid;
              gap: 6px;
              transition: border 0.2s ease, transform 0.2s ease;
            }

            .row:hover { transform: translateY(-2px); border-color: #ffd7cc; }
            .row.active { border-color: var(--accent); box-shadow: 0 10px 24px rgba(255, 107, 74, 0.16); }

            .row-title {
              font-weight: 600;
              font-size: 14px;
            }

            .row-meta {
              font-size: 12px;
              color: var(--muted);
              display: flex;
              flex-wrap: wrap;
              gap: 6px 12px;
            }

            .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
            .tag {
              font-size: 11px;
              padding: 4px 8px;
              border-radius: 999px;
              background: #f1f5f9;
              color: #0f172a;
            }

            .detail h2 {
              margin: 0 0 8px;
              font-family: "Space Grotesk", sans-serif;
              font-size: 20px;
            }

            .detail .field {
              margin-bottom: 12px;
            }

            .detail label {
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: var(--muted);
              margin-bottom: 6px;
            }

            .detail input,
            .detail select,
            .detail textarea {
              width: 100%;
              border-radius: 12px;
              border: 1px solid var(--line);
              padding: 10px 12px;
              font-size: 13px;
              background: #fff;
              font-family: "IBM Plex Sans", sans-serif;
            }

            .detail textarea { min-height: 140px; resize: vertical; }

            .actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .actions button {
              border-radius: 999px;
              border: none;
              padding: 9px 14px;
              font-weight: 600;
              cursor: pointer;
            }

            .btn-primary { background: var(--accent); color: #fff; }
            .btn-ghost { background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; }
            .btn-warn { background: #1f2937; color: #fff; }
            .btn-danger { background: #ef4444; color: #fff; }

            .toast {
              position: fixed;
              bottom: 24px;
              right: 24px;
              background: #0f172a;
              color: #fff;
              padding: 10px 14px;
              border-radius: 12px;
              font-size: 13px;
              opacity: 0;
              transform: translateY(10px);
              transition: opacity 0.2s ease, transform 0.2s ease;
              pointer-events: none;
            }

            .toast.show { opacity: 1; transform: translateY(0); }

            .empty {
              padding: 20px;
              border-radius: 14px;
              background: #fff;
              border: 1px dashed var(--line);
              text-align: center;
              color: var(--muted);
            }

            @media (max-width: 960px) {
              .layout { grid-template-columns: 1fr; }
              .list { max-height: 50vh; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <header class="hero">
              <div>
                <div class="eyebrow">eDebatte Control</div>
                <h1>Beitragsübersicht & Redaktion</h1>
                <p>Archivieren, löschen, Themen/Kategorien pflegen und das AI-Orchester jederzeit anstoßen.</p>
              </div>
              <div class="token-box">
                <label>Admin-Token (optional)</label>
                <div class="token-row">
                  <input id="tokenInput" type="password" placeholder="CONTRIB_WRITE_TOKEN" />
                  <button id="tokenSave" type="button">Speichern</button>
                </div>
              </div>
            </header>

            <section class="stats" id="stats">
              <div class="stat"><div class="label">Gesamt</div><div class="value" id="statTotal">–</div></div>
              <div class="stat"><div class="label">Pending</div><div class="value" id="statPending">–</div></div>
              <div class="stat"><div class="label">Archiviert</div><div class="value" id="statArchived">–</div></div>
              <div class="stat"><div class="label">Letztes Update</div><div class="value" id="statUpdated">–</div></div>
            </section>

            <section class="controls">
              <input id="searchInput" type="search" placeholder="Suche nach Text, ID, Topic…" />
              <select id="statusFilter">
                <option value="">Status: alle</option>
                <option value="pending_review">pending_review</option>
                <option value="pending">pending</option>
                <option value="review">review</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <select id="reviewFilter">
                <option value="">Review: alle</option>
                <option value="pending">pending</option>
                <option value="none">none</option>
                <option value="queued">queued</option>
                <option value="in-review">in-review</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="archived">archived</option>
              </select>
              <select id="sourceFilter">
                <option value="">Quelle: alle</option>
                <option value="landing_demo">landing_demo</option>
                <option value="contribution_new">contribution_new</option>
              </select>
              <button id="refreshBtn" type="button">Aktualisieren</button>
            </section>

            <section class="layout">
              <div class="panel">
                <div class="list" id="list"></div>
              </div>
              <div class="panel detail" id="detailPanel">
                <div class="empty">Beitrag auswählen, um Details zu sehen.</div>
              </div>
            </section>
          </div>
          <div class="toast" id="toast"></div>

          <script>
            const state = { items: [], filtered: [], selectedId: null, token: "" };
            const $ = (id) => document.getElementById(id);

            function escapeHtml(str) {
              return String(str || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");
            }

            function toast(message) {
              const el = $("toast");
              el.textContent = message;
              el.classList.add("show");
              setTimeout(() => el.classList.remove("show"), 2200);
            }

            function loadToken() {
              state.token = localStorage.getItem("contribToken") || "";
              $("tokenInput").value = state.token;
            }

            function saveToken() {
              state.token = $("tokenInput").value.trim();
              if (state.token) localStorage.setItem("contribToken", state.token);
              else localStorage.removeItem("contribToken");
              toast("Token gespeichert");
            }

            function headers(forWrite = false) {
              const h = { "content-type": "application/json" };
              if (state.token) {
                h[forWrite ? "x-write-token" : "x-read-token"] = state.token;
                if (!forWrite) h["x-read-token"] = state.token;
              }
              return h;
            }

            function normalizeFilter(value) {
              return value ? value.trim().toLowerCase() : "";
            }

            function computeStats() {
              const total = state.items.length;
              const pending = state.items.filter((i) => (i.status || "").includes("pending")).length;
              const archived = state.items.filter((i) => i.status === "archived").length;
              const last = state.items
                .map((i) => new Date(i.updatedAt || i.createdAt || 0))
                .sort((a, b) => b - a)[0];
              $("statTotal").textContent = total;
              $("statPending").textContent = pending;
              $("statArchived").textContent = archived;
              $("statUpdated").textContent = last && isFinite(last) ? last.toLocaleString("de-DE") : "–";
            }

            function applyFilters() {
              const search = normalizeFilter($("searchInput").value);
              const status = normalizeFilter($("statusFilter").value);
              const review = normalizeFilter($("reviewFilter").value);
              const source = normalizeFilter($("sourceFilter").value);

              state.filtered = state.items.filter((item) => {
                if (status && normalizeFilter(item.status) !== status) return false;
                if (review && normalizeFilter(item.reviewStatus) !== review) return false;
                if (source && normalizeFilter(item.source) !== source) return false;
                if (search) {
                  const hay = `${item.id} ${item.text} ${(item.analysis?.topics || []).join(" ")} ${(item.analysis?.categories || []).join(" ")}`
                    .toLowerCase();
                  if (!hay.includes(search)) return false;
                }
                return true;
              });
              renderList();
            }

            function renderList() {
              const list = $("list");
              if (!state.filtered.length) {
                list.innerHTML = '<div class="empty">Keine Beiträge gefunden.</div>';
                return;
              }
              list.innerHTML = state.filtered
                .map((item) => {
                  const isActive = item.id === state.selectedId;
                  const snippet = item.text.length > 140 ? item.text.slice(0, 140) + "…" : item.text;
                  const topics = (item.analysis?.topics || []).slice(0, 3);
                  const cats = (item.analysis?.categories || []).slice(0, 2);
                  return `
                    <div class="row ${isActive ? "active" : ""}" data-id="${item.id}">
                      <div class="row-title">${escapeHtml(snippet || "(kein Text)")}</div>
                      <div class="row-meta">
                        <span>ID: ${item.id.slice(-6)}</span>
                        <span>Status: ${escapeHtml(item.status || "–")}</span>
                        <span>Review: ${escapeHtml(item.reviewStatus || "–")}</span>
                        <span>${item.createdAt ? new Date(item.createdAt).toLocaleDateString("de-DE") : ""}</span>
                      </div>
                      <div class="tag-list">
                        ${topics.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
                        ${cats.map((t) => `<span class="tag" style="background:#e0f2fe;">${escapeHtml(t)}</span>`).join("")}
                      </div>
                    </div>
                  `;
                })
                .join("");

              list.querySelectorAll(".row").forEach((row) => {
                row.addEventListener("click", () => {
                  state.selectedId = row.getAttribute("data-id");
                  renderList();
                  renderDetail();
                });
              });
            }

            function renderDetail() {
              const panel = $("detailPanel");
              const item = state.items.find((i) => i.id === state.selectedId);
              if (!item) {
                panel.innerHTML = '<div class="empty">Beitrag auswählen, um Details zu sehen.</div>';
                return;
              }
              const analysis = item.analysis || {};
              const orchestrator = analysis.orchestrator || {};
              panel.innerHTML = `
                <h2>Beitrag ${item.id.slice(-6)}</h2>
                <div class="field">
                  <label>Text</label>
                  <textarea id="detailText" readonly>${escapeHtml(item.text)}</textarea>
                </div>
                <div class="field">
                  <label>Themen (kommagetrennt)</label>
                  <input id="detailTopics" value="${escapeHtml((analysis.topics || []).join(", "))}" />
                </div>
                <div class="field">
                  <label>Kategorien / Schlagworte (kommagetrennt)</label>
                  <input id="detailCategories" value="${escapeHtml((analysis.categories || []).join(", "))}" />
                </div>
                <div class="field">
                  <label>Status</label>
                  <select id="detailStatus">
                    ${["pending_review", "pending", "review", "published", "archived"].map((s) => `<option value="${s}" ${item.status === s ? "selected" : ""}>${s}</option>`).join("")}
                  </select>
                </div>
                <div class="field">
                  <label>Review-Status</label>
                  <select id="detailReview">
                    ${["pending", "none", "queued", "in-review", "approved", "rejected", "archived"].map((s) => `<option value="${s}" ${item.reviewStatus === s ? "selected" : ""}>${s}</option>`).join("")}
                  </select>
                </div>
                <div class="field">
                  <label>AI-Orchestrator</label>
                  <div class="row-meta" style="margin-bottom:6px;">
                    <span>Status: ${escapeHtml(analysis.status || "–")}</span>
                    <span>Run: ${analysis.lastRunAt ? new Date(analysis.lastRunAt).toLocaleString("de-DE") : "–"}</span>
                  </div>
                  <div class="row-meta">
                    <span>Claims: ${orchestrator.claimsCount || 0}</span>
                    <span>Questions: ${orchestrator.questionsCount || 0}</span>
                    <span>Notes: ${orchestrator.notesCount || 0}</span>
                  </div>
                </div>
                <div class="actions">
                  <button class="btn-primary" id="saveBtn">Speichern</button>
                  <button class="btn-ghost" id="archiveBtn">Archivieren</button>
                  <button class="btn-warn" id="aiBtn">AI-Orchester starten</button>
                  <button class="btn-danger" id="deleteBtn">Löschen</button>
                </div>
              `;

              $("saveBtn").addEventListener("click", async () => {
                const payload = {
                  status: $("detailStatus").value,
                  reviewStatus: $("detailReview").value,
                  topics: $("detailTopics").value,
                  categories: $("detailCategories").value,
                };
                await updateContribution(item.id, payload);
              });

              $("archiveBtn").addEventListener("click", async () => {
                await updateContribution(item.id, { status: "archived", reviewStatus: "archived" });
              });

              $("aiBtn").addEventListener("click", async () => {
                await orchestrateContribution(item.id);
              });

              $("deleteBtn").addEventListener("click", async () => {
                if (!confirm("Beitrag wirklich löschen?")) return;
                await deleteContribution(item.id);
              });
            }

            async function loadItems() {
              try {
                const res = await fetch("/api/contributions?limit=200", { headers: headers(false) });
                const data = await res.json();
                const items = Array.isArray(data) ? data : data.items;
                state.items = Array.isArray(items) ? items : [];
                computeStats();
                applyFilters();
                if (state.selectedId) {
                  const stillThere = state.items.find((i) => i.id === state.selectedId);
                  if (!stillThere) state.selectedId = null;
                  renderDetail();
                }
              } catch (err) {
                toast("Fehler beim Laden");
                console.error(err);
              }
            }

            async function updateContribution(id, payload) {
              try {
                const res = await fetch(`/api/contributions/${id}`, {
                  method: "PATCH",
                  headers: headers(true),
                  body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error || "update_failed");
                toast("Gespeichert");
                await loadItems();
              } catch (err) {
                toast("Update fehlgeschlagen");
                console.error(err);
              }
            }

            async function deleteContribution(id) {
              try {
                const res = await fetch(`/api/contributions/${id}`, {
                  method: "DELETE",
                  headers: headers(true),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error || "delete_failed");
                toast("Gelöscht");
                state.selectedId = null;
                await loadItems();
                renderDetail();
              } catch (err) {
                toast("Löschen fehlgeschlagen");
                console.error(err);
              }
            }

            async function orchestrateContribution(id) {
              try {
                toast("AI-Orchester läuft…");
                const res = await fetch(`/api/contributions/${id}/orchestrate`, {
                  method: "POST",
                  headers: headers(true),
                  body: JSON.stringify({ storeFull: false, applyTopics: true }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error || "orchestrate_failed");
                toast("Analyse abgeschlossen");
                await loadItems();
              } catch (err) {
                toast("AI-Orchester fehlgeschlagen");
                console.error(err);
              }
            }

            $("tokenSave").addEventListener("click", saveToken);
            $("refreshBtn").addEventListener("click", loadItems);
            $("searchInput").addEventListener("input", applyFilters);
            $("statusFilter").addEventListener("change", applyFilters);
            $("reviewFilter").addEventListener("change", applyFilters);
            $("sourceFilter").addEventListener("change", applyFilters);

            loadToken();
            loadItems();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  return NextResponse.json({ ok: true, total, items: data });
}
