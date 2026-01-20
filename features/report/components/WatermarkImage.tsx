// Ein einfaches SVG als Fallback für CI-Bild und Wasserzeichen.
// Für produktive AI-Bild-Generierung siehe generateImage.ts.

export default function WatermarkImage({ text = "eDebatte" }: { text?: string }) {
    return (
      <svg viewBox="0 0 800 320" className="w-full h-full object-cover" aria-label="eDebatte Bild-Fallback">
        <rect width="800" height="320" rx="48" fill="#FF6F61" />
        <text x="50%" y="46%" fontSize="42" textAnchor="middle" fill="#fff" fontWeight="bold" fontFamily="'Geist Sans',sans-serif">
          {text.length > 48 ? text.slice(0, 48) + "..." : text}
        </text>
        <text x="99%" y="95%" fontSize="28" textAnchor="end" fill="#fff" opacity="0.2" fontWeight="bold" fontFamily="'Geist Sans',sans-serif">
          eDebatte
        </text>
      </svg>
    );
  }
  
