import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth/requestScope", () => ({
  resolveRequestScopeContext: vi.fn(async () => null),
  summarizeRequestScopeContext: vi.fn(() => null),
}));

const DOCX_FIXTURE_BASE64 =
  "UEsDBAoAAAAIAIVzHF15bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMECgAAAAAAhXMcXQAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAgAhXMcXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBAoAAAAAAIVzHF0AAAAAAAAAAAAAAAAFAAAAd29yZC9QSwMECgAAAAgAhXMcXRZj0zLXAAAAQwEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2PsU7EMAxAfyXKTlMYTqhqewtiQ7qBY08TX2upcSI7pdy/sfFjJMeAhFieY1t5tvvjR1jVO7BgpEHfN61WQC56pHnQ59fnu0etJFvydo0Eg76C6OPY752PbgtAWRUBSbcPesk5dcaIWyBYaWICKr1L5GBzSXk2e2SfODoQKf6wmoe2PZhgkXRVTtFfa0wVXJHHN2BAkgUwKGCCraA3tVPJN6a/n54Q1AvmeUXwwOWgXJdCD6S+PqdSqa/JMmOxX8qAkp7DZLfmX7WAyyc2t8LPjub3/vEbUEsBAhQACgAAAAgAhXMcXXluM9foAAAArQEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAKAAAAAACFcxxdAAAAAAAAAAAAAAAABgAAAAAAAAAAABAAAAAZAQAAX3JlbHMvUEsBAhQACgAAAAgAhXMcXZv9N+qtAAAAKQEAAAsAAAAAAAAAAAAAAAAAPQEAAF9yZWxzLy5yZWxzUEsBAhQACgAAAAAAhXMcXQAAAAAAAAAAAAAAAAUAAAAAAAAAAAAQAAAAEwIAAHdvcmQvUEsBAhQACgAAAAgAhXMcXRZj0zLXAAAAQwEAABEAAAAAAAAAAAAAAAAANgIAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAAFAAUAIAEAADwDAAAAAA==";

describe("POST /api/uploads document full-text path", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.VOG_MONGO_IN_MEMORY = "1";
  });

  it("stores extracted DOCX text privately and returns honest capabilities", async () => {
    const { POST } = await import("@/app/api/uploads/route");
    const { getMaterialFullTextRecord } = await import("@/features/material/materialFullTextStore");
    const formData = new FormData();
    formData.append(
      "files",
      new File([Buffer.from(DOCX_FIXTURE_BASE64, "base64")], "verein.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    const request = new NextRequest("http://localhost/api/uploads", { method: "POST", body: formData });

    const response = await POST(request);
    const body = await response.json();
    const materialId = body.materialRegistry.records[0].id as string;
    const stored = await getMaterialFullTextRecord(materialId);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      extractionProviderConfigured: false,
      localExtractionConfigured: true,
      rawObjectStorageProductionTruth: false,
      extractionCapabilities: {
        documentsExtractedLocally: 1,
        externalConversionRequired: 0,
        ocrConfigured: false,
      },
      fullTextPersistence: { stored: 1, privateOnly: true, reviewRequired: true },
    });
    expect(body.files[0]).toMatchObject({
      extractionOutcome: "extracted_locally",
      extractedBy: "mammoth@1",
      sourceFormat: "docx",
    });
    expect(body.materialRegistry.records[0]).toMatchObject({
      extractionState: "local_document_extraction",
      rawObjectStored: false,
      noAutoResearch: true,
      noAutoPublish: true,
      noAutoPublicOfficial: true,
    });
    expect(stored).toMatchObject({
      extractedBy: "mammoth@1",
      sourceFormat: "docx",
      privateOnly: true,
      reviewRequired: true,
      noAutoPublish: true,
    });
    expect(stored?.text).toContain("barrierefreien Umbau");
  });
});
