// apps/web/src/components/PipelineBox.tsx
export default function PipelineBox() {
    return (
        <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "linear-gradient(180deg, #F8FBFF 0%, #F6FAFE 100%)",
          }}>
            <div style={{ fontWeight: 800, marginBottom: 6, letterSpacing: 0.2 }}>Unser Analyse-Weg</div>
            <div style={{ color: "#6b7280", marginBottom: 10 }}>
              Danke für deinen Beitrag! So bereiten wir ihn für die Community und die Auswertung auf:
            </div>
            <ul style={{ marginLeft: 18, lineHeight: 1.7 }}>
              <li>Vorverarbeitung & Duplikate prüfen</li>
              <li>Kanon-Zuordnung (Thema & Unterthema)</li>
              <li>Region & Zuständigkeit erkennen</li>
              <li>Quellen-Hooks & Faktencheck-Hinweise</li>
              <li>Verständlichkeit & Prüf-Verben absichern</li>
            </ul>
          </div>
    );
  }
  