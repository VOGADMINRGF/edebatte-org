"use client";
import React from "react";
export default function ChatBubble({role="assistant",children}:{role?:"assistant"|"user";children:React.ReactNode}) {
  const isUser = role === "user";
  return (
    <div className={"flex mb-2 " + (isUser ? "justify-end" : "justify-start")}>
      <div className={(isUser?"bg-sky-600 text-white":"bg-slate-100 text-slate-800")+" rounded-2xl px-3 py-2 max-w-[680px] text-sm leading-relaxed"}>
        {children}
      </div>
    </div>
  );
}
