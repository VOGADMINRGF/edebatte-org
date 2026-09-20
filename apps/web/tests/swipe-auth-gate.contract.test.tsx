/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SwipeAuthGate } from "@/features/surfaces/swipes/components/SwipeAuthGate";

describe("swipe auth gate", () => {
  it("makes authentication the only continuation after the free swipe limit", () => {
    render(<SwipeAuthGate open count={10} limit={10} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Du hast 10 Themen eingeordnet." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Einloggen & weitermachen" }).getAttribute("href")).toBe(
      "/login?next=%2Fswipes",
    );
    expect(screen.getByRole("link", { name: "Kostenlos Konto anlegen" }).getAttribute("href")).toBe(
      "/register?next=%2Fswipes",
    );
    expect(screen.queryByRole("button", { name: /später/i })).toBeNull();
    expect(screen.queryByText(/Dossier weiterlesen/i)).toBeNull();
    expect(screen.queryByLabelText(/Anmeldehinweis schließen/i)).toBeNull();
  });
});
