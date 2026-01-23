"use client";
import { useState } from "react";

export default function SiteHeader(){
  const [open,setOpen]=useState(false);
  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-bold text-lg">eDebatte</a>
        <button aria-label="Menu" className="md:hidden p-2 border rounded" onClick={()=>setOpen(x=>!x)}>☰</button>
        <nav className="hidden md:flex gap-4 text-sm">
          <a href="/howtoworks/edebatte/dossier" className="hover:underline">Dossier &amp; Faktencheck</a>
          <a href="/swipes" className="hover:underline">Abstimmen</a>
          <a href="/mitglied-werden" className="hover:underline">Mitmachen</a>
        </nav>
      </div>
      {open && (
        <nav className="md:hidden border-t px-4 py-2 flex flex-col gap-2 text-sm bg-white">
          <a href="/howtoworks/edebatte/dossier" className="py-1">Dossier &amp; Faktencheck</a>
          <a href="/swipes" className="py-1">Abstimmen</a>
          <a href="/mitglied-werden" className="py-1">Mitmachen</a>
        </nav>
      )}
    </header>
  );
}
