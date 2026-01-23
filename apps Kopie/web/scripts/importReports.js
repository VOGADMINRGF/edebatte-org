require('dotenv').config({ path: '.env.local' });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Passe ggf. DB-Name und Modelnamen an
const MONGODB_URI = process.env.MONGODB_URI;
console.log("[DEBUG] MONGODB_URI:", MONGODB_URI);

const Report = mongoose.model(
  "Report",
  new mongoose.Schema({}, { strict: false })
);

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: "vog" });

  const file = path.resolve(__dirname, "data/initialReports.json");
  let raw = fs.readFileSync(file, "utf-8");
  let reports = [];

  try {
    raw = JSON.parse(raw);
    reports = Array.isArray(raw) ? raw : (raw.reports ? raw.reports : [raw]);
  } catch (err) {
    console.error("[ERROR] initialReports.json konnte nicht geparsed werden:", err.message);
    process.exit(1);
  }

  // --- Check & Defaults für E90+/E100+ Felder ---
  reports = reports
    .filter(r => !!r.title || !!r.summary)
    .map(r => ({
      ...r,
      id: r.id || undefined,
      statementId: r.statementId || "",
      statementIds: Array.isArray(r.statementIds) ? r.statementIds : [],
      title: r.title || "",
      subtitle: r.subtitle || "",
      summary: r.summary || "",
      details: r.details || "",
      recommendation: r.recommendation || "",
      topArguments: r.topArguments || { pro: [], contra: [], neutral: [] },
      facts: Array.isArray(r.facts) ? r.facts : [],
      charts: Array.isArray(r.charts) ? r.charts : [],
      chartUrls: Array.isArray(r.chartUrls) ? r.chartUrls : [],
      images: Array.isArray(r.images) ? r.images : [],
      imageUrl: r.imageUrl || "",
      trailerUrl: r.trailerUrl || "",
      regionalVoices: Array.isArray(r.regionalVoices) ? r.regionalVoices : [],
      voices: Array.isArray(r.voices) ? r.voices : [],
      swipes: Array.isArray(r.swipes) ? r.swipes : [],
      votes: r.votes || { agree: 0, neutral: 0, disagree: 0 },
      bookmarks: typeof r.bookmarks === "number" ? r.bookmarks : 0,
      likes: typeof r.likes === "number" ? r.likes : 0,
      region: r.region || "",
      regions: Array.isArray(r.regions) ? r.regions : [],
      regionScope: Array.isArray(r.regionScope) ? r.regionScope : [],
      languages: Array.isArray(r.languages) ? r.languages : ["de"],
      tags: Array.isArray(r.tags) ? r.tags : [],
      focusGroups: Array.isArray(r.focusGroups) ? r.focusGroups : [],
      sources: Array.isArray(r.sources) ? r.sources : [],
      relatedStatements: Array.isArray(r.relatedStatements) ? r.relatedStatements : [],
      relatedReports: Array.isArray(r.relatedReports) ? r.relatedReports : [],
      author: r.author || "system",
      status: r.status || "published",
      reportAvailable: r.reportAvailable !== undefined ? !!r.reportAvailable : false,
      redaktionFreigabe: r.redaktionFreigabe !== undefined ? !!r.redaktionFreigabe : false,
      reviewedBy: Array.isArray(r.reviewedBy) ? r.reviewedBy : [],
      reviewStatus: r.reviewStatus || "",
      modLog: Array.isArray(r.modLog) ? r.modLog : [],
      analytics: typeof r.analytics === "object" ? r.analytics : {},
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: r.updatedAt || new Date().toISOString(),
      version: typeof r.version === "number" ? r.version : 1,
      deleted: r.deleted !== undefined ? !!r.deleted : false,
      archived: r.archived !== undefined ? !!r.archived : false
    }));

  await Report.deleteMany({});
  await Report.insertMany(reports);
  console.log("✅ Import abgeschlossen:", reports.length, "Reports importiert.");
  process.exit();
}

run();
