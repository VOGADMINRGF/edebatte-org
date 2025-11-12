// Einheitliches Schema (Non-Stream + Stream)
export const ANALYZE_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    outline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          summary: { type: "string" },
          start: { type: "integer" },
          end:   { type: "integer" }
        },
        required: ["id","label","summary","start","end"]
      }
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          text: { type: "string" },
          title:{ type: ["string","null"] },
          summary:{ type: ["string","null"] },
          context:{ type: "array", items: { type: "string" } },
          zustaendigkeit:{ type:["string","null"] },
          ort:{ type:["string","null"] },
          zeitraum:{ type:["string","null"] },
          sources:{ type:"array", items:{ type:"string" } }
        },
        required: ["text"]
      }
    }
  },
  required: ["ok","outline","claims"]
} as const;

export const OUTLINE_SCHEMA = {
  type:"object", additionalProperties:false,
  properties:{ outline:{ type:"array", items: ANALYZE_RESULT_SCHEMA.properties!.outline.items } },
  required:["outline"]
} as const;

export const CLAIMS_SCHEMA = {
  type:"object", additionalProperties:false,
  properties:{ claims: ANALYZE_RESULT_SCHEMA.properties!.claims },
  required:["claims"]
} as const;
