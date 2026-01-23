export type StepSend = (event:string, data:any)=>void;
export type StepContext = {
  text: string;
  lang?: string;
  urls?: string[];
  data: Record<string, any>;
  result?: { topics:any[]; theses:any[]; statements:any[]; summary:any };
};
export type StepDefinition = {
  id: string;
  label: string;
  when?: (ctx: StepContext)=>boolean;
  run: (ctx: StepContext, send: StepSend)=>Promise<void|Partial<StepContext>>;
};
