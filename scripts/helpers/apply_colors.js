#!/usr/bin/env node
/**
 * Inject turquoise→blue gradient tokens into apps/web styles and keep purple as accent for buttons.
 */
const fs = require('fs');
const path = require('path');

function ensureFile(p, content) {
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, content, "utf8");
}

const TW = `
/* eDebatte → e‑Debatte gradient tokens */
:root {
  --brand-from: #00B3A6; /* turquoise */
  --brand-to:   #005BFF; /* blue */
  --accent:     #6B46C1; /* purple accent */
  --chip-border:#0EA5E9;
  --bg-soft:    #F8FAFC;
  --text-strong:#0F172A;
}
.brand-gradient {
  background-image: linear-gradient(90deg, var(--brand-from), var(--brand-to));
}
.btn-accent {
  background-color: var(--accent);
  color: white;
}
`;

const target = "apps/web/src/styles/globals.css";
ensureFile(target, "/* created by apply_colors */\n");
let s = fs.readFileSync(target, "utf8");
if (!s.includes("--brand-from")) {
  s = TW + "\n" + s;
  fs.writeFileSync(target, s, "utf8");
  console.log("[colors] injected tokens into globals.css");
} else {
  console.log("[colors] tokens already present");
}

// Optional Tailwind config patch (if present)
const twcfg = "apps/web/tailwind.config.ts";
if (fs.existsSync(twcfg)) {
  let c = fs.readFileSync(twcfg, "utf8");
  if (!c.includes("brand-from")) {
    c = c.replace(/theme:\s*\{[\s\S]*?\}/m, (m)=>{
      if (m.includes("extend:")) return m;
      return m.replace(/theme:\s*\{/, 'theme: { extend: { colors: { "brand-from":"var(--brand-from)", "brand-to":"var(--brand-to)", accent:"var(--accent)" } },');
    });
    fs.writeFileSync(twcfg, c, "utf8");
    console.log("[colors] patched tailwind config (basic)");
  }
}
