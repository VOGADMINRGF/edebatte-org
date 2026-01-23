import { StepDefinition, StepContext, StepSend } from "./types";
import { defaultSteps } from "./manifest";

export async function runPipeline(baseCtx: StepContext, send: StepSend, steps?:StepDefinition[]){
  const stack = steps || defaultSteps;
  let ctx = baseCtx;
  for (const step of stack){
    if (step.when && !step.when(ctx)) continue;
    send("status", { step: step.id, msg: step.label, start: true });
    const delta = await step.run(ctx, send);
    ctx = { ...ctx, ...(delta||{}), data: { ...(ctx.data||{}), ...((delta||{}).data||{}) } };
    send("status", { step: step.id, msg: step.label, end: true });
  }
  return ctx;
}
