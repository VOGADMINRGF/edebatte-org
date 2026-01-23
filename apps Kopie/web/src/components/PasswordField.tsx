"use client";
import { useState } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function PasswordField({ label, ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {label && <label className="block mb-1 text-sm">{label}</label>}
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={(rest.className ?? "") + " pr-10"}
      />
      <button
        type="button"
        aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
