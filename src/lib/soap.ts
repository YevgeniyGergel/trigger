import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SOAP_SCHEMA = {
  type: "object",
  properties: {
    subjective: { type: "string" },
    objective: { type: "string" },
    assessment: { type: "string" },
    plan: { type: "string" },
  },
  required: ["subjective", "objective", "assessment", "plan"],
  additionalProperties: false,
};

/**
 * Structures a raw session transcript into SOAP notes via Claude. Output is
 * always a draft — design.md requires the psychologist to review/edit before
 * it's treated as a final document; this function only produces the draft.
 */
export async function structureSoapNote(transcriptText: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system:
      "You are a clinical documentation assistant for a psychologist. Structure the following therapy session transcript into SOAP note format (Subjective, Objective, Assessment, Plan). Write in the same language as the transcript. This is a draft for the psychologist to review — be faithful to the transcript and do not invent clinical content that isn't supported by it.",
    messages: [{ role: "user", content: transcriptText }],
    output_config: { format: { type: "json_schema", schema: SOAP_SCHEMA } },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("SOAP structuring returned no text content");
  }

  const parsed = JSON.parse(block.text) as {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };

  return [
    `Subjective:\n${parsed.subjective}`,
    `Objective:\n${parsed.objective}`,
    `Assessment:\n${parsed.assessment}`,
    `Plan:\n${parsed.plan}`,
  ].join("\n\n");
}
