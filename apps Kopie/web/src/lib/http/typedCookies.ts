import { cookies } from "next/headers";
export type CookieOptions = { httpOnly?: boolean; sameSite?: "lax"|"strict"|"none"; secure?: boolean; path?: string; maxAge?: number; };
export async function getCookie(name: string): Promise<string|null> { const jar = await cookies(); return jar.get(name)?.value ?? null; }
export async function setCookie(name: string, value: string, opts: CookieOptions = {}) { const jar = await cookies(); jar.set(name, value, { httpOnly:true, sameSite:"lax", secure:false, path:"/", ...opts }); }
export async function deleteCookie(name: string) { const jar = await cookies(); jar.delete(name); }
