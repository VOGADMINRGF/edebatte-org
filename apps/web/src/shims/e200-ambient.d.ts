// DO NOT ship to prod without replacing with real impls.
// E200 ambient shims: nur zum Kompilieren – Runtime bleibt unverändert.
declare const JWT_SECRET: string;
declare const CSRF_HEADER: string;
declare const ENABLED: boolean;
declare const VALID: any; // Record<string, any> | Set<string>
declare const OPENAI_URL: string;
declare const MODEL: string;
declare const TIMEOUT_MS: number;
declare const DEFAULTS: any;
declare const BodySchema: { parse<T=any>(x:any):T; safeParse<T=any>(x:any):{success:boolean; data?:T; error?:any} };
declare const EnqueueSchema: { parse<T=any>(x:any):T };
declare const ParamsSchema: { parse<T=any>(x:any):T };
declare function toShortLang(x:any): string;

declare type Role = "guest" | "user" | "editor" | "admin" | (string & {});
declare const dictionaries: Record<string, any>;
declare const TEASERS: any[];
declare const infoTiles: any[];
declare const MapClient: React.FC<any>;

// Graph/Repo placeholders (nur für Typzufriedenheit – kein Runtime-Ersatz)
declare const VCOLS: string[];
declare const ECOLS: string[];
declare const repo: any;

// odd env placeholders used in neo4j client
declare const URL: string;
declare const USER: string;
declare const PASS: string;

// arango & db helpers
declare const dbName: string;
declare const uri: string;
declare const password: string;

// util helper seen in db wrappers
declare function asFn<T=any>(x:any): any;

// next/navigation hook fallback (falls alte Next-Version)
declare module "next/navigation" {
  export function usePathname(): string;
  export function useParams<T=any>(): T;
}


// --- E200 extras (nur für Typen – Runtime unverändert) ---
declare const PROVS: Array<{ id?: string; envKeys: string[]; name?: string; label?: string; note?: string }>;
declare const ALLOWED_MIME: Set<string>;
declare function PWD_OK(pw: unknown): boolean;
declare const DEFAULT_FROM: string;
declare const ROUNDS: number;
declare const TTL_DAYS: number;

declare const ADMIN_ROLES: Set<string>;
declare function isVerifiedPath(x: string): boolean;
declare function isPublic(x: string): boolean;
declare function isLocationOnboarding(x: string): boolean;

// häufige "Model/Scheme" Namen
declare const MediaObjectSchema: any;
declare const RegionalVoiceSchema: any;
declare const ReportChartSchema: any;
declare const RegionObjSchema: any;
declare const VotingRuleSchema: any;
declare const RoleObjectSchema: any;
declare const BadgeSchema: any;

// Mongoose "conn" & ErrorLogModel nur typisieren (kein Runtime)
declare const conn: any;
declare const ErrorLogModel: any;

// TOPIC_KEYWORDS etc.
declare const TOPIC_KEYWORDS: Record<string, string[] | RegExp[]>;

// BodyZ alias (Zod-Schema)
declare const BodyZ: { parse<T=any>(x:any):T };

// roles (FAQTabs)
declare const roles: any[];
