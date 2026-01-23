import type { StepDefinition } from "../types";
import { sleep } from "../util";

export const confirmStep: StepDefinition = {
  id: "confirm",
  label: "Bestätigung",
  async run(_ctx, send){
    send("confirm", { msg: "Passen Themen/Kernaussagen? Du kannst jetzt korrigieren oder wir machen weiter." });
    await sleep(400); // auto-continue; echter Stop erfordert extra POST/WS
  }
};
