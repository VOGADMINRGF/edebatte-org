import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("final create mobile-first presentation contract", () => {
  it("keeps the citizen input ahead of process chrome and Voxy decoration", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/create-mobile-polish.css"),
      "utf8",
    );
    const client = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const shell = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"),
      "utf8",
    );
    const followup = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const composer = readFileSync(
      resolve(process.cwd(), "src/features/create/SharedCreateComposer.tsx"),
      "utf8",
    );

    expect(`${css}\n${client}\n${followup}`).not.toContain("create-chat-spine");
    expect(client).not.toContain("data-create-thread-prompt-chip");
    expect(shell).not.toContain("data-create-shell-pipeline");
    expect(followup).not.toContain("data-create-pipeline-rail");
    expect(css).toContain("[data-create-workspace-shell] [data-voxy-avatar]");
    expect(css).toContain("width: 3.25rem !important");
    expect(css).toContain('[data-create-composer-bar="true"] textarea');
    expect(css).toContain("min-height: clamp(11rem, 30svh, 19rem) !important");
    expect(css).toContain("resize: vertical !important");
    expect(composer).toContain('data-create-input-methods="shared-intake"');
    expect(composer).toContain('recognizer.lang = locale === "en" ? "en-US" : "de-DE"');
  });

  it("does not describe mandatory login protection as optional", () => {
    const login = readFileSync(
      resolve(process.cwd(), "src/components/auth/LoginPageShell.tsx"),
      "utf8",
    );

    expect(login).toContain("Anmeldung mit 2FA");
    expect(login).not.toContain("optional mit 2FA");
  });
});
