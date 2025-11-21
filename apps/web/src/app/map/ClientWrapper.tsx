"use client";
import dynamic from "next/dynamic";
import { useLocale } from "@/context/LocaleContext";

const MapClient = dynamic(() => import("@features/map/components/MapClient"), { ssr: false });

export default function MapClientWrapper() {
  const { locale } = useLocale();
  return <MapClient locale={locale} />;
}
