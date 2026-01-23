//apps/web/src/components/analyze/ActivityConsole.tsx
"use client";
export function ActivityConsole({ progress, logs, news }:{
  progress:number; logs:string[]; news:{title:string;url:string;relevance?:number}[];
}) {
  return (
    <div className="space-y-3">
      <div className="w-full h-2 bg-gray-200 rounded">
        <div className="h-2 bg-blue-500 rounded" style={{width:`${progress}%`}} />
      </div>
      <div className="bg-gray-50 rounded border p-2 text-xs max-h-28 overflow-auto">
        {logs.length===0 ? <div className="text-gray-500">…</div> :
          logs.map((l,i)=><div key={i} className="text-gray-700">{l}</div>)}
      </div>
      {news.length>0 &&
        <div className="bg-gray-50 rounded border p-2 text-xs">
          <div className="font-semibold mb-1">Quellen (live)</div>
          <ul className="list-disc ml-4">
            {news.map((n,i)=><li key={i}><a className="underline" href={n.url} target="_blank">{n.title}</a>
              {typeof n.relevance==="number" ? ` · Relevanz ${Math.round(n.relevance*100)}%` : ""}</li>)}
          </ul>
        </div>}
    </div>
  );
}
