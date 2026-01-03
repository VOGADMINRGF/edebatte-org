# TRIMONGO + GRAPH CONTRACT (Nicht-Verschlechterung)

Dieses Dokument ist der verbindliche Architektur-Vertrag. Alle Patches muessen ihn einhalten.

## 1) Canonical Storage: triMongo

**triMongo ist die einzige kanonische Datenquelle.**  
Wir nutzen 4 logisch getrennte MongoDB-Datenbanken:

- **core**: Entities wie Statements, Candidates, Drafts, Reports, Moderation/Flags, Factcheck-Jobs, etc.
- **votes**: Votes, Swipe-Events, Aggregationen
- **pii**: sensible User/Profile/Verifizierung
- **ai_core_reader**: read-only Spiegel fuer AI/Analyse-Workloads (keine Writes)

**Regel:** Keine zweite Wahrheit. Kein Prisma als kanonischer Speicher. **ai_core_reader** ist read-only.

## 2) Relationen

Relationen werden ueber IDs modelliert (`statementId`, `impactId`, `authorId`, ...).  
Mongo `_id` ist die stabile Identitaet.

## 3) GraphDB / Neo4j / Arango / Memgraph

GraphDB ist **Spiegel** und **Power-Feature**, nicht primaer.  
Nodes spiegeln Entities, Edges spiegeln Relationen:

- `hat_Impact`, `kommentiert`, `entkraeftet`, `gehoert_zu_Thema`
- `votet_auf`, `ist_Autor`, `unterstuetzt`, `widerspricht` etc.

**Regel:** Graph Sync ist **async/best-effort** und darf **niemals** Publish/UX blockieren.

**Node Key:** `mongo:<collection>:<objectId>`

## 4) Legacy / Uebergang

Mongoose/Legacy-Modelle duerfen existieren, aber:

- Sie duerfen **nicht** in kritischen Pipelines importiert werden: Feeds, Analyze-Pending, Factcheck.
- Sie duerfen **keinen** Publish blockieren.

Prisma darf **nicht** notwendig sein, um MVP-Flows laufen zu lassen.

## 5) Definition "kritische Pipelines"

- `/api/feeds/*` (pull/batch/analyze-pending/drafts/publish)
- `/api/factcheck/*`
- `features/feeds/*`
- Analyze-Pipelines in `features/analyze/*`

## 6) CI/Preflight

Vor jedem Patch muss `scripts/codex-preflight.mjs` laufen.  
Bei Verstoessen (Strict Mode) darf Codex keinen Patch anwenden.

