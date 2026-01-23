import * as React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };
export function Button({ className = "", variant = "primary", ...props }: Props) {
  const base =
    variant === "primary"
      ? "btn-primary"
      : "btn-ghost";
  return <button className={`${base} ${className}`} {...props} />;
}
