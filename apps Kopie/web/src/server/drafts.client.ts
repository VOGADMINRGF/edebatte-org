// apps/web/src/server/drafts.client.ts  (NEU – nur Client-Helfer via HTTP)
export async function createDraft(init: any) {
    const res = await fetch("/api/drafts", {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(init)
    });
    if (!res.ok) throw new Error("draft create failed");
    const js = await res.json();
    return { id: js.id, draft: js.draft };
  }
  
  export async function patchDraft(id: string, patch: any) {
    const res = await fetch(`/api/drafts/${id}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error("draft patch failed");
    return res.json();
  }
  