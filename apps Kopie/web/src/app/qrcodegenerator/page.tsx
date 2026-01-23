"use client";
import React from "react";
import QRCodeGenerator from "@/components/QRCodeGenerator";

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>QR Code Generator</h1>
      <QRCodeGenerator />
    </main>
  );
}
