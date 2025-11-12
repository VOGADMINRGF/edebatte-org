"use client";
import * as React from "react";

export type MiniClaim = {
  text: string;
  zustaendigkeit: "EU"|"Bund"|"Land"|"Kommune"|"-";
  sachverhalt?: string;
};

function levelChip(lvl: MiniClaim["zustaendigkeit"]) {
  const map: Record<string,string> = {
    EU: "EU • Brüssel",
    Bund: "Bund • Berlin",
    Land: "Land",
    Kommune: "Kommune",
    "-": "Zuständigkeit offen"
  };
  return map[lvl] ?? "Zuständigkeit";
}

export default function StatementCard({
  c,
  onVote,
}: {
  c: MiniClaim;
  onVote?: (vote: "pro" | "neu" | "contra") => void;
}) {
  const short = React.useMemo(() => {
    const s = (c.text || "").replace(/\s+/g, " ").trim();
    return s.length > 140 ? s.slice(0, 137) + "…" : s;
  }, [c.text]);

  return (
    <li className="rounded-xl border border-black/5 bg-white/90 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-[2px]">
          <span className="h-[6px] w-[6px] rounded-full bg-cyan-500/70" />
          {levelChip(c.zustaendigkeit)}
        </span>
      </div>

      <div className="text-[15px] font-medium leading-snug">{short}</div>

      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        <button onClick={() => onVote?.("pro")} className="rounded-lg bg-black text-white px-3 py-1.5 hover:bg-black/90">Zustimmen</button>
        <button onClick={() => onVote?.("neu")} className="rounded-lg border border-black/10 px-3 py-1.5 hover:bg-black/5">Neutral</button>
        <button onClick={() => onVote?.("contra")} className="rounded-lg border border-black/10 px-3 py-1.5 hover:bg-black/5">Ablehnen</button>
      </div>
    </li>
  );
}
