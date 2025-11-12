"use client";
import * as React from "react";

export type RegisterItem = {
  id: string;
  role: "main" | "support" | "counter" | "context";
  kind: "policy" | "fact" | "value" | "concern" | "question";
  text: string;
  zustaendigkeit?: string;
  members?: string[];
};

export function StatementRegister({
  items, selectedIds, onToggle, onCompose,
}:{
  items: RegisterItem[]; selectedIds: string[];
  onToggle: (id: string)=>void; onCompose: (ids: string[])=>void;
}) {
  const groups: Record<RegisterItem["role"], RegisterItem[]> =
    { main:[], support:[], counter:[], context:[] };
  items.forEach(i => groups[i.role].push(i));

  const Block = ({title, list}:{title:string; list:RegisterItem[]}) => (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map(i => {
          const sel = selectedIds.includes(i.id);
          return (
            <li key={i.id} className={`rounded-lg border p-3 ${sel ? "border-black ring-1 ring-black/30" : "border-gray-200"}`}>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={sel} onChange={()=>onToggle(i.id)} className="mt-0.5"/>
                <div className="flex-1">
                  <div className="text-sm font-medium leading-snug">{i.text}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-gray-600">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 border">{i.kind.toUpperCase()}</span>
                    {i.zustaendigkeit && <span className="rounded bg-gray-50 px-1.5 py-0.5 border">Zust.: {i.zustaendigkeit}</span>}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={()=>onCompose(selectedIds)} disabled={!selectedIds.length}
          className="px-3 py-1.5 rounded-md bg-black text-white disabled:opacity-50">Auswahl zu Entwurf</button>
        <div className="text-xs text-gray-600">{selectedIds.length} ausgewählt</div>
      </div>
      <Block title="Hauptaussagen" list={groups.main}/>
      <Block title="Argumente" list={groups.support}/>
      <Block title="Einwände" list={groups.counter}/>
      <Block title="Kontext" list={groups.context}/>
    </div>
  );
}
