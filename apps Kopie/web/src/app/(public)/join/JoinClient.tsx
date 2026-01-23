"use client";

import QuickRegister, {
  QuickRegisterSuccess,
} from "@/components/QuickRegister";

export default function JoinClient() {
  return (
    <div className="p-6">
      <h1>Join</h1>
      <QuickRegister
        source="join_page"
        onSuccess={(p: QuickRegisterSuccess) => console.log("Quick OK", p)}
      />
    </div>
  );
}
