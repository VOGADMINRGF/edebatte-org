import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenAI } from "@features/ai/providers/openai";

type OpenAiRequestBody = {
  model?: string;
  text?: {
    format?: {
      type?: string;
      name?: string;
      schema?: unknown;
      strict?: boolean;
    };
  };
  reasoning?: { effort?: string };
};

describe("openai-provider.reasoning.contract", () => {
  const requestBodies: OpenAiRequestBody[] = [];

  beforeEach(() => {
    requestBodies.splice(0, requestBodies.length);
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const payload = JSON.parse(String(init?.body ?? "{}"));
        requestBodies.push(payload);
        return new Response(
          JSON.stringify({
            model: payload?.model ?? "unknown",
            usage: { input_tokens: 10, output_tokens: 12 },
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: "{\"mode\":\"E150\",\"claims\":[],\"notes\":[],\"questions\":[],\"knots\":[],\"consequences\":{\"consequences\":[],\"responsibilities\":[]},\"responsibilityPaths\":[],\"decisionTrees\":[],\"eventualities\":[],\"impactAndResponsibility\":{\"impacts\":[],\"responsibleActors\":[]},\"report\":{\"summary\":null,\"keyConflicts\":[],\"facts\":{\"local\":[],\"international\":[]},\"openQuestions\":[],\"takeaways\":[]}}" }],
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not send reasoning.effort for gpt-4.1-mini while keeping json format", async () => {
    await callOpenAI({
      prompt: "return json",
      asJson: true,
      forceJsonFormat: true,
      model: "gpt-4.1-mini",
    });

    expect(requestBodies).toHaveLength(1);
    const body = requestBodies[0];
    expect(body.model).toBe("gpt-4.1-mini");
    expect(body.reasoning).toBeUndefined();
    expect(body.text?.format?.type).toBe("json_schema");
  });

  it("sends reasoning.effort for gpt-5 models", async () => {
    await callOpenAI({
      prompt: "return json",
      asJson: true,
      forceJsonFormat: true,
      model: "gpt-5",
    });

    expect(requestBodies).toHaveLength(1);
    const body = requestBodies[0];
    expect(body.model).toBe("gpt-5");
    expect(body.reasoning?.effort).toBe("minimal");
    expect(body.text?.format?.type).toBe("json_schema");
  });

  it("passes a strict schema to the provider and does not silently downgrade when fallback is disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(
          JSON.stringify({
            error: {
              message: "json_schema not supported",
              param: "text.format",
              code: "json_schema_not_supported",
            },
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        );
      }),
    );

    await expect(
      callOpenAI({
        prompt: "return planner json",
        asJson: true,
        model: "gpt-4.1-mini",
        allowJsonFormatFallback: false,
        jsonSchema: {
          name: "create_planner_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["plannerClusters"],
            properties: {
              plannerClusters: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      }),
    ).rejects.toThrow(/json_schema not supported/);

    expect(requestBodies).toHaveLength(1);
    expect(requestBodies[0]?.text?.format).toMatchObject({
      type: "json_schema",
      name: "create_planner_result",
      strict: true,
      schema: expect.objectContaining({
        properties: {
          plannerClusters: {
            type: "array",
            items: { type: "string" },
          },
        },
      }),
    });
  });

  it("aborts the underlying fetch when timeoutMs is reached", async () => {
    vi.useFakeTimers();
    let aborted = false;

    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        requestBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            aborted = true;
            reject(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }));
            return;
          }
          signal?.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }));
            },
            { once: true },
          );
        });
      }),
    );

    const promise = callOpenAI({
      prompt: "return json",
      asJson: true,
      forceJsonFormat: true,
      model: "gpt-4.1-mini",
      timeoutMs: 9_500,
    });
    void promise.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(9_500);

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(aborted).toBe(true);
    expect(requestBodies[0]?.model).toBe("gpt-4.1-mini");
  });
});
