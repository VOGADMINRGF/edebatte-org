"use client";
import React from "react";

type GateProps = {
  show: boolean;
  children: React.ReactNode | (() => React.ReactNode);
};

export default function ClaimPanelsGate({ show, children }: GateProps) {
  if (!show) return null;
  if (typeof children === "function") {
    return <>{(children as () => React.ReactNode)()}</>;
  }
  return <>{children}</>;
}