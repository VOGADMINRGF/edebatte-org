import { buildVoxyMotionV41Plan } from "./motionV41";
import {
  renderVoxyMotionV4FrameHtml,
  type VoxyMotionV4EmbeddedAssets,
  type VoxyMotionV4ViewportGeometry,
} from "./motionV4Html";
import { buildVoxyAudioMouthFrame } from "./voicedExplainerV1Html";
import {
  VOXY_DUAL_VOICE_PILOT_EVIDENCE,
  buildVoxyDemocracyBroadcastMeta,
  lowerThirdAt,
  speakerAt,
  visualStateAt,
  type VoxyBroadcastMeta,
  type VoxyDualVoicePilotVisualEntry,
  type VoxyExplainerPilotPlan,
  type VoxyFinalLayoutPlan,
  type VoxyLowerThirdEntry,
  type VoxyPilotEvidence,
} from "./dualVoiceExplainerPilot";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stateProgress(state: VoxyDualVoicePilotVisualEntry, atSeconds: number): number {
  return clamp01((atSeconds - state.start) / Math.max(0.001, state.end - state.start));
}

function evidenceForPlan(plan: VoxyExplainerPilotPlan): readonly VoxyPilotEvidence[] {
  return plan.evidence as readonly VoxyPilotEvidence[];
}

function evidenceById(plan: VoxyExplainerPilotPlan, id: string): VoxyPilotEvidence | undefined {
  return evidenceForPlan(plan).find((entry) => entry.id === id)
    ?? VOXY_DUAL_VOICE_PILOT_EVIDENCE.find((entry) => entry.id === id);
}

function renderEvidenceCore(plan: VoxyExplainerPilotPlan, evidenceId: string): string {
  const evidence = evidenceById(plan, evidenceId);
  if (!evidence) return "";
  const common = `data-evidence-id="${escapeHtml(evidence.id)}" data-visual-identity="${escapeHtml(evidence.visualIdentity)}" data-evidence-type="${escapeHtml(evidence.type)}"`;
  if (evidence.visualPayload.kind === "trend_line") {
    return `<div class="evidence-core evidence-trust" ${common}>
      <div class="fixture-label">${escapeHtml(evidence.provenance)}</div>
      <small class="evidence-kind">${escapeHtml(evidence.type)}</small>
      <h1>${escapeHtml(evidence.title)}</h1>
      <div class="trend-chart" aria-label="Illustrativer Zeitverlauf ohne behauptete Werte">
        <i class="axis axis-x"></i><i class="axis axis-y"></i>
        <svg viewBox="0 0 600 150" aria-hidden="true"><path class="trend-line" d="M20 106 C115 94, 142 42, 228 67 S353 131, 430 92 S520 54, 580 72"/><circle cx="228" cy="67" r="7"/><circle cx="430" cy="92" r="7"/></svg>
        <span class="trend-note">${escapeHtml(evidence.sourceLabel ?? evidence.shortSummary)}</span>
      </div>
    </div>`;
  }
  if (evidence.visualPayload.kind === "bar_series") {
    const values = evidence.visualPayload.values ?? [];
    return `<div class="evidence-core evidence-participation" ${common}>
      <div class="fixture-label">${escapeHtml(evidence.provenance)}</div>
      <small class="evidence-kind">${escapeHtml(evidence.type)}</small>
      <h1>${escapeHtml(evidence.title)}</h1>
      <div class="participation-chart" aria-label="Illustrativer Beteiligungsindikator ohne behauptete Werte">
        ${values.map((value) => `<i style="--bar:${value}"></i>`).join("")}
      </div>
      <span class="trend-note">${escapeHtml(evidence.sourceLabel ?? evidence.shortSummary)}</span>
    </div>`;
  }
  return `<div class="evidence-core evidence-question" ${common}>
    <div class="fixture-label">${escapeHtml(evidence.provenance)}</div>
    <small class="evidence-kind">${escapeHtml(evidence.type)}</small>
    <span class="question-ring">?</span>
    <h1>${escapeHtml(evidence.title)}</h1>
  </div>`;
}

function renderTopicZone(meta: VoxyBroadcastMeta): string {
  return `<section class="topic-date-zone" data-topic-date-zone="true">
    <small>${escapeHtml(meta.topicLabel)}</small>
    <strong>${escapeHtml(meta.topicTitle)}</strong>
    ${meta.displayDate ? `<time>${escapeHtml(meta.displayDate)}</time>` : ""}
  </section>`;
}

function visibleMemoryIds(state: VoxyDualVoicePilotVisualEntry): readonly string[] {
  return state.dockedEvidenceIds.filter(
    (id) => !(state.state === "DOCK" && state.activeEvidenceId === id),
  );
}

function renderMemory(plan: VoxyExplainerPilotPlan, state: VoxyDualVoicePilotVisualEntry): string {
  const visibleIds = visibleMemoryIds(state);
  const olderIds = visibleIds.slice(0, Math.max(0, visibleIds.length - 3));
  const fullIds = visibleIds.slice(-3);
  return `<section class="memory-stack" data-memory-anchor="top-right" data-memory-count="${visibleIds.length}" data-dynamic-evidence="true">
    <header><span>IM GEDÄCHTNIS</span><small>${visibleIds.length ? `${visibleIds.length} EVIDENZ${visibleIds.length === 1 ? "" : "EN"}` : "BEREIT"}</small></header>
    <div class="memory-cards" data-overflow-behavior="compact-by-priority-recency">
      ${visibleIds.length === 0 ? '<div class="memory-empty">Erklärte Evidenz bleibt hier sichtbar.</div>' : ""}
      ${olderIds.length ? `<div class="memory-overflow" data-grouped-evidence-count="${olderIds.length}"><b>+ ${olderIds.length} weitere Evidenz${olderIds.length === 1 ? "" : "en"}</b><span>kompakt nach Relevanz und Aktualität gruppiert</span></div>` : ""}
      ${fullIds.map((id, index) => `<div class="memory-card" data-evidence-id="${escapeHtml(id)}" data-memory-object="true" data-memory-slot="${index}">${renderEvidenceCore(plan, id)}</div>`).join("")}
    </div>
  </section>`;
}

function renderRightColumn(plan: VoxyExplainerPilotPlan, state: VoxyDualVoicePilotVisualEntry, meta: VoxyBroadcastMeta): string {
  return `<aside class="broadcast-right-column" data-column-anchor="top-right">
    ${renderTopicZone(meta)}
    ${renderMemory(plan, state)}
  </aside>`;
}

function renderActiveEvidence(plan: VoxyExplainerPilotPlan, state: VoxyDualVoicePilotVisualEntry, progress: number): string {
  if (!state.activeEvidenceId || state.state === "SYNTHESIS") return "";
  const docking = state.state === "DOCK" ? smooth(progress) : 0;
  const build = state.state === "FOCUS" ? smooth(progress) : 1;
  const slotIndex = Math.max(0, state.dockedEvidenceIds.indexOf(state.activeEvidenceId));
  const dockX = 804;
  const dockY = 104 + slotIndex * 142;
  return `<section class="information-stage" data-evidence-id="${escapeHtml(state.activeEvidenceId)}" data-object-continuity="same-object-scale-translation" data-dock-destination="upper-right-memory-slot" style="--dock:${docking};--build:${build};--dock-x:${dockX}px;--dock-y:${dockY}px;--dock-scale:.48">
    ${renderEvidenceCore(plan, state.activeEvidenceId)}
  </section>`;
}

function renderSynthesis(plan: VoxyExplainerPilotPlan): string {
  const [first, second, derived] = evidenceForPlan(plan);
  if (!first || !second || !derived) return "";
  return `<section class="synthesis-stage" data-synthesis-uses="${escapeHtml(`${first.id} ${second.id}`)}" data-derived-evidence-id="${escapeHtml(derived.id)}">
    <div class="fixture-label">${escapeHtml(derived.provenance)}</div>
    <small class="evidence-kind">ZUSAMMENFÜHRUNG</small>
    <h1>Erst die Beziehung ergibt ein Bild.</h1>
    <div class="synthesis-flow">
      <div class="synthesis-source">${renderEvidenceCore(plan, first.id)}</div>
      <div class="relationship-line"><i></i><span>zusammen betrachten</span><i></i></div>
      <div class="synthesis-source">${renderEvidenceCore(plan, second.id)}</div>
    </div>
    <div class="derived-question">${renderEvidenceCore(plan, derived.id)}</div>
  </section>`;
}

function fallbackLowerThird(meta: VoxyBroadcastMeta, durationSeconds: number): VoxyLowerThirdEntry {
  return {
    id: "broadcast-overview",
    kicker: meta.kicker,
    headline: meta.headline,
    summary: meta.summary,
    validFrom: 0,
    validUntil: durationSeconds,
    transitionMs: 360,
    transition: "soft_translate_fade",
    minimumDwellSeconds: 3,
    wordByWordAnimation: false,
    blinking: false,
    captionMirror: false,
  };
}

function renderLowerThird(entry: VoxyLowerThirdEntry, atSeconds: number): string {
  const transitionSeconds = entry.transitionMs / 1_000;
  const reveal = smooth((atSeconds - entry.validFrom) / transitionSeconds);
  return `<section class="broadcast-lower-third" data-lower-third="semantic" data-lower-third-id="${escapeHtml(entry.id)}" data-caption-mirror="false" data-word-by-word="false" data-blinking="false" style="--text-reveal:${reveal}">
    <i class="lower-accent"></i>
    <div class="lower-copy">
      <small>${escapeHtml(entry.kicker)}</small>
      <strong>${escapeHtml(entry.headline)}</strong>
      <p>${escapeHtml(entry.summary)}</p>
    </div>
    <div class="lower-meta"><b>FAKTENBASIERT</b><span>NEUTRAL · TRANSPARENT</span></div>
  </section>`;
}

export function renderVoxyDualVoicePilotFrameHtml(input: {
  plan: VoxyExplainerPilotPlan;
  assets: VoxyMotionV4EmbeddedAssets;
  frameIndex: number;
  amplitude: number;
  viewportGeometry?: VoxyMotionV4ViewportGeometry;
}): string {
  const atSeconds = input.frameIndex / input.plan.output.fps;
  const speaker = speakerAt(input.plan, atSeconds);
  const visual = visualStateAt(input.plan, atSeconds);
  const progress = stateProgress(visual, atSeconds);
  const editorial = speaker?.speakerRole === "editorial";
  const audioMouth = buildVoxyAudioMouthFrame(input.amplitude);
  const mouth = editorial
    ? { mouthState: "closed" as const, mouthNextState: "closed" as const, mouthMix: 0 }
    : audioMouth;
  const sourceDurationFrames = 22 * input.plan.output.fps;
  const sourceFrameIndex = editorial
    ? Math.floor(input.frameIndex % (2.2 * input.plan.output.fps))
    : input.frameIndex % sourceDurationFrames;
  const motionPlan = buildVoxyMotionV41Plan(input.plan.exactHeadSha).baseMotionPlan;
  const baseHtml = renderVoxyMotionV4FrameHtml({
    plan: motionPlan,
    assets: input.assets,
    frameIndex: sourceFrameIndex,
    displayFrameIndex: input.frameIndex,
    mouthProfile: "v4.1",
    mouthOverride: mouth,
    waveformAmplitude: input.amplitude,
    viewportGeometry: input.viewportGeometry,
    editorialOverride: { kicker: "", title: "", brand: "", caption: "" },
  });

  const meta = "broadcastMeta" in input.plan
    ? input.plan.broadcastMeta
    : buildVoxyDemocracyBroadcastMeta(null);
  const lowerThird = "lowerThirdTimeline" in input.plan
    ? lowerThirdAt(input.plan as VoxyFinalLayoutPlan, atSeconds)
    : fallbackLowerThird(meta, input.plan.output.durationMs / 1_000);
  const informational = visual.state !== "HOST";
  const injected = `${informational ? '<div class="information-dimmer"></div>' : ""}
    <div class="broadcast-chrome" data-broadcast-grid="stable">
      ${renderRightColumn(input.plan, visual, meta)}
      ${visual.state === "SYNTHESIS" ? renderSynthesis(input.plan) : renderActiveEvidence(input.plan, visual, progress)}
      ${renderLowerThird(lowerThird, atSeconds)}
      <footer class="broadcast-footer">VOXY <i></i> DIGITAL MODERATOR <i></i> eDEBATTE</footer>
    </div>`;

  const css = `
.caption-bar,.portrait-caption,.editorial-cue{display:none!important}
.information-dimmer{position:absolute;z-index:12;inset:28px;border-radius:21px;background:linear-gradient(90deg,rgba(1,6,18,.28) 0%,rgba(1,6,18,.38) 48%,rgba(1,6,18,.72) 100%);box-shadow:inset 0 0 110px rgba(2,9,28,.34)}
.broadcast-chrome{position:absolute;z-index:14;inset:0;pointer-events:none;color:#f7fbff;font-family:Inter,Arial,sans-serif}
.broadcast-right-column{position:absolute;z-index:28;top:52px;right:56px;width:420px;display:grid;gap:14px}
.topic-date-zone{min-height:132px;padding:18px 22px;border:1px solid rgba(139,184,226,.48);border-radius:17px;background:linear-gradient(145deg,rgba(4,17,40,.96),rgba(1,8,23,.97));box-shadow:0 24px 60px rgba(0,0,0,.34)}
.topic-date-zone small{display:block;color:#4de3db;font-size:11px;font-weight:900;letter-spacing:.17em}
.topic-date-zone strong{display:block;margin-top:9px;font-size:21px;line-height:1.08;letter-spacing:-.018em}
.topic-date-zone time{display:block;margin-top:13px;padding-top:10px;border-top:1px solid rgba(128,170,213,.2);color:#acc3dc;font-size:12px;font-weight:700;letter-spacing:.04em}
.memory-stack{padding:15px 16px 16px;border:1px solid rgba(72,139,222,.42);border-radius:17px;background:linear-gradient(155deg,rgba(3,14,36,.97),rgba(1,7,20,.985));box-shadow:0 28px 75px rgba(0,0,0,.42)}
.memory-stack>header{display:flex;align-items:center;justify-content:space-between;height:24px;color:#a8c9ea;font-size:10px;font-weight:900;letter-spacing:.15em}
.memory-stack>header small{color:#5ee6de;font-size:8px}
.memory-cards{display:grid;gap:9px;margin-top:8px}
.memory-empty{height:70px;display:grid;place-items:center;border:1px dashed rgba(91,145,203,.32);border-radius:11px;color:#718da9;font-size:11px}
.memory-overflow{height:54px;display:flex;flex-direction:column;justify-content:center;padding:8px 12px;border:1px solid rgba(82,139,198,.28);border-radius:10px;background:rgba(7,25,52,.7);color:#91abc5;font-size:8px;letter-spacing:.05em}.memory-overflow b{color:#c5d7e8;font-size:10px}.memory-overflow span{margin-top:4px}
.memory-card{height:132px;padding:12px 14px;border-left:3px solid #1ed4c6;border-radius:11px;background:linear-gradient(135deg,rgba(9,40,78,.94),rgba(7,25,56,.93));overflow:hidden;box-shadow:inset 0 0 28px rgba(31,118,205,.08)}
.memory-card .fixture-label{padding:2px 6px;font-size:6px}
.memory-card .evidence-kind{margin-top:5px;font-size:7px}
.memory-card .evidence-core h1{margin-top:4px;font-size:16px;line-height:1.02}
.memory-card .trend-chart{height:45px;margin-top:5px;padding:0 4px;background:transparent}
.memory-card .trend-chart svg{height:40px}
.memory-card .axis,.memory-card .trend-note,.memory-card .participation-chart+.trend-note{display:none}
.memory-card .participation-chart{height:42px;margin-top:5px;padding:4px 7px 0;gap:5px;background:transparent}
.memory-card .participation-chart i{height:calc(var(--bar)*36px)}
.memory-card .evidence-question{display:grid;grid-template-columns:35px 1fr;gap:3px 8px}
.memory-card .evidence-question .fixture-label,.memory-card .evidence-question .evidence-kind{grid-column:1/3}
.memory-card .question-ring{width:31px;height:31px;font-size:17px}
.memory-card .evidence-question h1{font-size:14px}
.information-stage{position:absolute;z-index:24;left:650px;top:165px;width:760px;height:430px;padding:34px 38px;border:1px solid rgba(83,158,244,.58);border-radius:25px;background:linear-gradient(145deg,rgba(5,18,45,.98),rgba(2,9,25,.99));box-shadow:0 35px 95px rgba(0,0,0,.52),0 0 62px rgba(21,112,255,.13);transform-origin:0 0;transform:translate(calc(var(--dock)*var(--dock-x)),calc(var(--dock)*var(--dock-y))) scale(calc(1 - var(--dock)*(1 - var(--dock-scale))));overflow:hidden}
.evidence-core{position:relative;width:100%;height:100%;color:#fff}
.fixture-label{display:inline-flex;padding:6px 10px;border:1px solid rgba(0,217,192,.42);border-radius:999px;background:rgba(0,217,192,.1);color:#6cece2;font-size:10px;font-weight:900;letter-spacing:.14em}
.evidence-kind{display:block;margin-top:18px;color:#8eb8ea;font-size:12px;font-weight:900;letter-spacing:.16em}
.evidence-core h1{max-width:680px;margin:10px 0 0;font-size:39px;line-height:1.03;letter-spacing:-.032em}
.trend-chart{position:relative;height:185px;margin-top:20px;padding:9px 14px 24px 29px;border-radius:16px;background:rgba(8,30,67,.62)}
.trend-chart svg{width:100%;height:140px;overflow:visible}
.axis{position:absolute;background:rgba(139,178,224,.22)}.axis-x{left:29px;right:17px;bottom:31px;height:1px}.axis-y{left:29px;top:15px;bottom:31px;width:1px}
.trend-line{fill:none;stroke:#20d8cb;stroke-width:7;stroke-linecap:round;stroke-dasharray:800;stroke-dashoffset:calc((1 - var(--build))*800)}
.trend-chart circle{fill:#04152f;stroke:#78eee4;stroke-width:4;opacity:var(--build)}
.trend-note{position:absolute;right:16px;bottom:9px;color:#92aecb;font-size:10px;font-weight:750;letter-spacing:.05em}
.participation-chart{display:flex;align-items:flex-end;gap:17px;height:170px;margin-top:20px;padding:18px 28px 0;border-bottom:1px solid rgba(139,178,224,.24);border-left:1px solid rgba(139,178,224,.24);background:linear-gradient(180deg,rgba(8,30,67,.56),rgba(8,30,67,.2))}
.participation-chart i{flex:1;height:calc(var(--bar)*142px*var(--build));border-radius:8px 8px 0 0;background:linear-gradient(180deg,#347fff,#164797);box-shadow:0 0 24px rgba(28,104,235,.16)}
.evidence-participation>.trend-note{position:static;display:block;margin-top:10px;text-align:right}
.evidence-question{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px 24px}
.evidence-question .fixture-label,.evidence-question .evidence-kind{grid-column:1/3}
.question-ring{display:grid;width:76px;height:76px;place-items:center;border:2px solid #ffb45e;border-radius:50%;color:#ffd29e;font-size:43px;font-weight:900;box-shadow:0 0 35px rgba(255,172,79,.17)}
.evidence-question h1{font-size:33px}
.synthesis-stage{--build:1;position:absolute;z-index:24;left:650px;top:118px;width:760px;height:590px;padding:32px 36px;border:1px solid rgba(85,157,241,.52);border-radius:25px;background:linear-gradient(145deg,rgba(5,18,45,.98),rgba(2,9,25,.99));box-shadow:0 35px 95px rgba(0,0,0,.52)}
.synthesis-stage>h1{margin:10px 0 15px;font-size:35px;letter-spacing:-.032em}
.synthesis-flow{display:grid;grid-template-columns:1fr 90px 1fr;align-items:center;gap:9px}
.synthesis-source{height:195px;padding:14px;border:1px solid rgba(67,137,224,.4);border-radius:14px;background:rgba(8,30,67,.68);overflow:hidden}
.synthesis-source .fixture-label{font-size:6px;padding:2px 5px}.synthesis-source .evidence-kind{margin-top:6px;font-size:7px}.synthesis-source h1{margin-top:4px;font-size:16px}
.synthesis-source .trend-chart,.synthesis-source .participation-chart{height:86px;margin-top:8px}.synthesis-source .trend-chart svg{height:70px}.synthesis-source .trend-note{display:none}
.relationship-line{display:grid;gap:8px;place-items:center;color:#8ab0da;font-size:8px;font-weight:850;text-align:center;letter-spacing:.07em}.relationship-line i{width:100%;height:1px;background:linear-gradient(90deg,transparent,#38d6cc,transparent)}
.derived-question{height:120px;margin-top:15px;padding:11px 15px;border:1px solid rgba(255,177,94,.52);border-radius:14px;background:rgba(60,35,12,.28)}
.derived-question .evidence-core{display:grid;grid-template-columns:50px 1fr;gap:3px 12px}.derived-question .fixture-label,.derived-question .evidence-kind{grid-column:1/3}.derived-question .fixture-label{font-size:6px;padding:2px 5px}.derived-question .evidence-kind{margin-top:3px;font-size:7px}.derived-question .question-ring{width:44px;height:44px;font-size:24px}.derived-question h1{font-size:19px}
.broadcast-lower-third{position:absolute;z-index:30;left:50px;right:500px;bottom:46px;min-height:170px;display:grid;grid-template-columns:7px 1fr 210px;gap:20px;align-items:center;padding:19px 24px;border:1px solid rgba(132,177,221,.48);border-radius:16px;background:linear-gradient(135deg,rgba(3,16,38,.965),rgba(1,8,23,.98));box-shadow:0 28px 70px rgba(0,0,0,.46);opacity:var(--text-reveal);transform:translateY(calc((1 - var(--text-reveal))*12px))}
.lower-accent{align-self:stretch;border-radius:999px;background:linear-gradient(180deg,#24e1d3,#1781f2);box-shadow:0 0 24px rgba(21,194,220,.22)}
.lower-copy small{display:block;color:#58e7df;font-size:11px;font-weight:900;letter-spacing:.16em}.lower-copy strong{display:block;margin-top:7px;font-size:30px;line-height:1.04;letter-spacing:-.025em}.lower-copy p{max-width:920px;margin:7px 0 0;color:#c5d4e3;font-size:15px;line-height:1.28}
.lower-meta{align-self:stretch;display:flex;flex-direction:column;justify-content:center;padding-left:20px;border-left:1px solid rgba(134,175,216,.3);color:#91aac4;font-size:10px;letter-spacing:.1em}.lower-meta b{color:#8adfd8;font-size:11px}.lower-meta span{margin-top:7px}
.broadcast-footer{position:absolute;z-index:31;right:56px;bottom:14px;display:flex;align-items:center;gap:10px;color:#5dcacb;font-size:9px;font-weight:850;letter-spacing:.14em}.broadcast-footer i{width:3px;height:3px;border-radius:50%;background:#2b8dcc}
`;

  return baseHtml
    .replace('alt="VOXY"', 'alt="VOG"')
    .replace("</style>", `${css}</style>`)
    .replace('<div class="frame"></div>', `${injected}<div class="frame"></div>`)
    .replace(
      '<main class="viewport"',
      `<main class="viewport" data-pilot-version="1.4-final-layout" data-pilot-state="${visual.state}" data-speaker-role="${speaker?.speakerRole ?? "none"}" data-active-evidence-id="${visual.activeEvidenceId ?? "none"}" data-docked-evidence-count="${visual.dockedEvidenceIds.length}" data-editorial-mouth-neutral="${editorial}" data-burned-in-captions="false" data-text-transition="semantic-soft-fade"`,
    );
}
