import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CREATE_CLIENT_SIGNAL_HEADER,
  CREATE_HONEYPOT_HEADER,
  CREATE_HONEYPOT_MAX_LENGTH,
  CREATE_MUTATION_CSRF_HEADER,
  CREATE_MUTATION_CSRF_VALUE,
  createMutationRequestHeaders,
} from "@/features/create/createMutationSecurityContract";

const clientSource = readFileSync(new URL("../src/app/create/CreateClient.tsx", import.meta.url), "utf8");

describe("create client honeypot contract", () => {
  it("keeps legitimate headers unchanged and the default trap absent", () => {
    const headers = createMutationRequestHeaders();

    expect(headers).toEqual({
      "content-type": "application/json",
      [CREATE_MUTATION_CSRF_HEADER]: CREATE_MUTATION_CSRF_VALUE,
    });
    expect(headers[CREATE_HONEYPOT_HEADER]).toBeUndefined();
  });

  it("reduces a filled trap to a bounded non-content signal", () => {
    const rawValue = "https://spam.example/private-trap-value";
    const headers = createMutationRequestHeaders({ honeypotValue: rawValue, clientSignal: "bounded_signal_01" });

    expect(headers[CREATE_HONEYPOT_HEADER]).toBe("1");
    expect(JSON.stringify(headers)).not.toContain(rawValue);
    expect(headers[CREATE_CLIENT_SIGNAL_HEADER]).toBe("bounded_signal_01");
    expect(headers[CREATE_MUTATION_CSRF_HEADER]).toBe(CREATE_MUTATION_CSRF_VALUE);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("drops malformed optional client signals instead of creating an identity", () => {
    expect(createMutationRequestHeaders({ clientSignal: "personal@example.org" })[CREATE_CLIENT_SIGNAL_HEADER]).toBeUndefined();
    expect(createMutationRequestHeaders({ clientSignal: "x".repeat(65) })[CREATE_CLIENT_SIGNAL_HEADER]).toBeUndefined();
  });

  it("owns one controlled off-screen trap with an empty bounded state", () => {
    expect(clientSource).toContain('const [createHoneypotValue, setCreateHoneypotValue] = React.useState("")');
    expect(clientSource).toContain('name="request_note_2f7"');
    expect(clientSource).toContain('aria-hidden="true"');
    expect(clientSource).toContain("tabIndex={-1}");
    expect(clientSource).toContain('autoComplete="off"');
    expect(clientSource).toContain('left: "-10000px"');
    expect(clientSource).toContain('pointerEvents: "none"');
    expect(clientSource).toContain("event.currentTarget.value.slice(0, CREATE_HONEYPOT_MAX_LENGTH)");
    expect(CREATE_HONEYPOT_MAX_LENGTH).toBe(160);
    expect(clientSource.match(/data-create-meta-field="v1"/g)).toHaveLength(1);
  });

  it("propagates the trap through all five canonical mutation callsites only", () => {
    expect(clientSource.match(/honeypotValue: createHoneypotValue/g)).toHaveLength(5);
    expect(clientSource.match(/createMutationRequestHeaders\(/g)).toHaveLength(5);
    for (const route of [
      "/api/create/save",
      "/api/create/intelligent-followup",
      "/api/create/link-analysis",
    ]) {
      expect(clientSource).toContain(route);
    }
  });

  it("adds no persistence, logging, session issuance, or visible dependency", () => {
    const honeypotLines = clientSource
      .split("\n")
      .filter((line) => /createHoneypotValue|setCreateHoneypotValue/.test(line))
      .join("\n");

    expect(honeypotLines).not.toMatch(
      /localStorage|sessionStorage|cookie|console|analytics|telemetry|JSON\.stringify/,
    );
    expect(clientSource).not.toContain('fetch("/api/create/session"');
    expect(clientSource).not.toMatch(
      /createHoneypotValue[^\n]*(planner|dossier|analysis|content)/i,
    );
  });
});
