import { SUPPORTED_LOCALES } from "./src/config/locales";

export const locales = SUPPORTED_LOCALES;
export type Locale = (typeof locales)[number];
