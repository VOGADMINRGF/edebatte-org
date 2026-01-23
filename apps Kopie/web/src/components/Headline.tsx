import React from "react";
export default function Headline({ children }: { children?: React.ReactNode }) {
  return <h2 className="text-xl font-bold mb-3">{children}</h2>;
}
