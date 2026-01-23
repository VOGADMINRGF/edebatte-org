import React from "react";
export default function TabNav({ tabs = [], children }: { tabs?: string[]; children?: React.ReactNode[] }) {
  return <div>{children}</div>;
}
