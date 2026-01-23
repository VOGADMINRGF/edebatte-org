import type { StepDefinition } from "../types";

export const factcheckStub: StepDefinition = {
  id: "factcheck",
  label: "Faktencheck (Stub)",
  when(ctx){ return !!ctx.result; },
  async run(ctx, send){
    const base = ctx.result?.theses?.length? ctx.result.theses : ctx.result?.statements || [];
    const facts = base.slice(0,3).map((t:any,i:number)=>({
      claim: t.text, verdict: i%2===0? "stützt":"widerspricht", confidence: 60+i*10
    }));
    send("factcheck", { facts });
  }
};
