// src/utils/gptTranslator.ts
export async function fetchGptTranslation(
  text: string,
  to: string,
): Promise<string> {
  const systemPrompt = `Übersetze den folgenden Text professionell und natürlich ins ${to}:`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
