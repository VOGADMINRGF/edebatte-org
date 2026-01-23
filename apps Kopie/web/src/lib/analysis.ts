export type Analysis = any;
const analyzeLocal = (input:any)=>({ ok:true, input });
export default analyzeLocal;
export function sha256(x:any){ return String(x)?.length.toString(16).padStart(64,"0"); }
export function heuristicAnalyze(x:any){ return { ok:true, input:x }; }
export function extractUrls(x:string){ return Array.from(x?.matchAll(/https?:\/\/\S+/g)).map(m=>m[0]); }
export function guessLang(_x:any){ return "de"; }
