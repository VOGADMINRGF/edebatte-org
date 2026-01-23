import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { POST } from "@/app/api/contact/route";
import { sendMail } from "@/utils/mailer";

vi.mock("@/utils/mailer", () => ({
  sendMail: vi.fn(async () => ({ ok: true })),
}));
const sendMailMock = sendMail as unknown as Mock;

function buildForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const defaults = {
    category: "presse",
    name: "Test Nutzer",
    email: "test@example.com",
    phone: "",
    subject: "Frage",
    message: "Dies ist eine ganz normale Nachricht ohne Spam.",
    newsletterOptIn: "",
    website: "",
    hp_contact: "",
    formStartedAt: String(Date.now() - 5000),
    turnstileToken: "",
  };
  const entries = { ...defaults, ...overrides };
  Object.entries(entries).forEach(([key, value]) => form.set(key, value));
  return form;
}

async function callContact(form: FormData, ip = "1.1.1.1") {
  const req = new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "x-forwarded-for": ip,
    },
    body: form,
  });
  return POST(req as any);
}

describe("contact API spam protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a normal request", async () => {
    const res = await callContact(buildForm(), "10.0.0.1");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.classification).toBe("ham");
    expect(sendMailMock.mock.calls.length).toBe(2);
  });

  it("drops honeypot submissions silently", async () => {
    const res = await callContact(buildForm({ hp_contact: "bot" }), "10.0.0.2");
    const body = await res.json();
    expect(body.classification).toBe("spam");
    expect(sendMailMock.mock.calls.length).toBe(0);
  });

  it("flags forms filled too fast", async () => {
    const res = await callContact(buildForm({ formStartedAt: String(Date.now()) }), "10.0.0.3");
    const body = await res.json();
    expect(body.classification).toBe("spam");
    expect(sendMailMock.mock.calls.length).toBe(0);
  });

  it("detects keyword spam", async () => {
    const res = await callContact(
      buildForm({
        formStartedAt: String(Date.now() - 6000),
        message: "Tolles webdesign angebot mit backlinks und Domain Authority 90.",
      }),
      "10.0.0.4",
    );
    const body = await res.json();
    expect(body.classification).toBe("suspicious");
    expect(body.spamScore).toBeGreaterThanOrEqual(2);
    expect(sendMailMock.mock.calls.length).toBe(2);
  });

  it("flags messages with many links", async () => {
    const links = Array.from({ length: 6 })
      .map((_, i) => `https://spam-${i}.example.com`)
      .join(" ");
    const res = await callContact(
      buildForm({
        formStartedAt: String(Date.now() - 6000),
        message: `Hier sind viele Links: ${links}`,
      }),
      "10.0.0.5",
    );
    const body = await res.json();
    expect(body.classification).toBe("suspicious");
    expect(body.spamScore).toBeGreaterThanOrEqual(2);
    expect(sendMailMock.mock.calls.length).toBe(2);
  });

  it("rate limits after multiple hits from same ip", async () => {
    let lastRes: Response | null = null;
    for (let i = 0; i < 6; i++) {
      lastRes = await callContact(
        buildForm({ subject: `Req ${i}`, formStartedAt: String(Date.now() - 6000) }),
        "20.0.0.9",
      );
    }
    const body = await (lastRes as Response).json();
    expect((lastRes as Response).status).toBe(429);
    expect(body.error).toBe("rate_limited");
  });
});
