"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

export default function PageWrapper({
  children,
  className = "",
  centered = true,
}: PageWrapperProps) {
  return (
    <main
      className={clsx(
        "flex-1 px-4 py-20",
        centered && "max-w-3xl mx-auto text-center space-y-6",
        className,
      )}
    >
      {children}
    </main>
  );
}
