import * as React from "react";
export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-black/5 ${className}`} {...props} />;
}
