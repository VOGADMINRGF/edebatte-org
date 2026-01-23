// ---- Next minimal shims ----
declare module "next/navigation" {
  export function notFound(): never;
  export function redirect(url: string): never;
  export function useRouter(): any;
  export function useSearchParams(): any;
  export function useParams<T = any>(): T;
}

declare module "next/link" {
  // default React-Komponente – als Funktion deklarieren, vermeidet TS1254
  export default function Link(props: any): any;
}

declare module "next/dynamic" {
  // default Funktion – vermeidet TS1254
  export default function dynamic(...args: any[]): any;
}

declare module "next/headers" {
  export function cookies(): any;
  export function headers(): any;
}

declare module "next/server" {
  export type NextRequest = any;
  // als Wert exportieren, nicht nur Type
  export const NextResponse: {
    json: (body: any, init?: any) => any;
    redirect?: any;
    rewrite?: any;
  };
  export function headers(): any;
  export const cookies: any;
}

declare module "next" {
  export type Route = string;
  export type Metadata = any;
}

declare module "next-auth" {
  export function getServerSession(...args: any[]): any;
}

// ---- UI & libs ----
declare module "@vog/ui" {
  const _: any;
  export const Header: any;
  export const Footer: any;
  export const Badge: any;
  export const Button: any;
  export const Input: any;
  export const Card: any;
  export const CardHeader: any;
  export const CardContent: any;
  export const CardFooter: any;
  export const Avatar: any;
  export const AvatarImage: any;
  export const AvatarFallback: any;
  export const badgeColors: any;
  export const getBadgeColor: any;
  export const Separator: any;
  export default _;
}

declare module "@ui" {
  const _default: any;
  export default _default;
}

declare module "@ui/design/badgeColor" {
  export const badgeColors: any;
}

// ---- MapLibre (alles any)
declare module "maplibre-gl" {
  const anyExport: any;
  export = anyExport;
}

// ---- Third-party ----
declare module "react-beautiful-dnd";
declare module "bcryptjs";
declare module "otplib";
declare module "html2canvas";
declare module "jspdf";

// ---- Contribution (named export erwartet)
declare module "contribution" {
  export const ContributionCard: any;
  const _default: any;
  export default _default;
}

// ---- Features: ANY (Public-Check)
// KEIN 'export =' plus 'export default' gemischt (führt zu Konflikten)
declare module "@features/*" {
  const anyExport: any;
  export default anyExport;
}
