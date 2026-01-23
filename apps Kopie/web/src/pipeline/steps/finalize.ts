import type { StepDefinition } from "../types";
export const finalizeStep: StepDefinition = {
  id: "finalize",
  label: "Abschluss",
  async run(_ctx, send){ send("done", {}); }
};
