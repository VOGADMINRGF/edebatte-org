// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VogPublicBallotClient } from "@/app/vog/fragen/[code]/[questionId]/VogPublicBallotClient";
import type { VogPublicBallotReadModel } from "@/features/vog/publicBallotReadModel";
import type { VogOriginMetadata, VogPublicBallotUiLocale } from "@features/vog/publicBallotContract";

const CODE = "VOGSET01";
const QUESTION_ID = "question-1";
const DRAFT_KEY = `edebatte:vog-public-ballot-draft:v1:${CODE}:${QUESTION_ID}`;

const LOCALE_COPY = {
  de: {
    title: "Soll diese Option priorisiert werden?",
    context: "Kurzer belegter Kontext.",
    options: { yes: "Ja", no: "Nein", open: "Noch offen" },
  },
  fr: {
    title: "Cette option doit-elle être prioritaire ?",
    context: "Bref contexte documenté.",
    options: { yes: "Oui", no: "Non", open: "Encore ouvert" },
  },
  ar: {
    title: "هل ينبغي إعطاء الأولوية لهذا الخيار؟",
    context: "سياق موجز وموثق.",
    options: { yes: "نعم", no: "لا", open: "ما زال مفتوحًا" },
  },
} as const;

type TestLocale = keyof typeof LOCALE_COPY;

function ballot(locale: TestLocale): VogPublicBallotReadModel {
  const copy = LOCALE_COPY[locale];
  return {
    code: CODE,
    questionId: QUESTION_ID,
    originId: "vog-question-01",
    originalLocale: "de",
    readingLocale: locale,
    uiLocale: locale as VogPublicBallotUiLocale,
    outputLocale: locale,
    requestedReadingLocale: locale,
    requestedOutputLocale: locale,
    readingTranslationStatus: locale === "de" ? "original" : "translated",
    outputTranslationStatus: locale === "de" ? "original" : "translated",
    availableLocales: ["de", "en", "fr", "es", "tr", "ar"],
    direction: locale === "ar" ? "rtl" : "ltr",
    lifecycle: "open",
    title: copy.title,
    context: copy.context,
    options: [
      { optionId: "yes", label: copy.options.yes },
      { optionId: "no", label: copy.options.no },
      { optionId: "open", label: copy.options.open },
    ],
    sources: [
      { id: "source-1", label: "Primärquelle", href: "https://example.org/source" },
    ],
    counterPositions: [
      {
        id: "counter-1",
        label: "Gegenposition",
        href: "https://example.org/counter",
      },
    ],
    accessMode: "public_guest",
    attributionMode: "hidden",
    legitimacyClass: "open_public_consultation",
    ownSelection: null,
    ownSelectionLabel: null,
    results: null,
  };
}

function metadata(locale: TestLocale): VogOriginMetadata {
  return {
    source: "vote4gov",
    origin: "voiceopengov",
    originId: "vog-question-01",
    originalLocale: "de",
    readingLocale: locale,
    uiLocale: locale as VogPublicBallotUiLocale,
    outputLocale: locale,
  };
}

const localeLinks = ["de", "en", "fr", "es", "tr", "ar"].map((locale) => ({
  locale,
  href: `/vog/fragen/${CODE}/${QUESTION_ID}?reading_locale=${locale}&ui_locale=${locale}&output_locale=${locale}`,
}));

function renderBallot(locale: TestLocale) {
  return render(
    <VogPublicBallotClient
      initialBallot={ballot(locale)}
      originMetadata={metadata(locale)}
      localeLinks={localeLinks}
    />,
  );
}

describe("VOG public ballot language-switch interaction", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows understandable language names instead of code-only links", () => {
    renderBallot("de");

    for (const name of [
      "Deutsch · DE",
      "English · EN",
      "Français · FR",
      "Español · ES",
      "Türkçe · TR",
      "العربية · AR",
    ]) {
      expect(screen.getByRole("link", { name })).toBeTruthy();
    }

    expect(screen.getByRole("link", { name: "العربية · AR" }).getAttribute("dir")).toBe("rtl");
  });

  it("keeps an unsent stable option selected after a language switch and remount", async () => {
    const user = userEvent.setup();
    const firstRender = renderBallot("de");

    await user.click(screen.getByRole("radio", { name: "Ja" }));
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBe("yes");

    const frenchLink = screen.getByRole("link", { name: "Français · FR" });
    frenchLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    await user.click(frenchLink);

    firstRender.unmount();
    renderBallot("fr");

    await waitFor(() => {
      const translatedOption = screen.getByRole("radio", { name: "Oui" }) as HTMLInputElement;
      expect(translatedOption.checked).toBe(true);
    });
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBe("yes");
  });

  it("removes an invalid stored option instead of restoring attacker-controlled state", async () => {
    window.sessionStorage.setItem(DRAFT_KEY, "not-a-canonical-option");

    renderBallot("de");

    await waitFor(() => expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull());
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.every((radio) => radio.checked === false)).toBe(true);
  });

  it("clears the language-independent draft after a successful vote write", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          ballot: null,
          vote: { updatedExisting: false },
        }),
      }),
    );

    renderBallot("de");
    await user.click(screen.getByRole("radio", { name: "Ja" }));
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBe("yes");

    await user.click(screen.getByRole("button", { name: "Stimme abgeben" }));

    await waitFor(() => expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull());
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
