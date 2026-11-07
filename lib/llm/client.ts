import OpenAI from "openai";
import { z } from "zod";

export const llm = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "dummy-key",
  baseURL: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
});

export const MODEL = process.env.LLM_MODEL?.trim() || "openai/gpt-oss-120b";

interface CallLlmJsonOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
}

/**
 * Call the LLM in JSON mode with temperature 0, Zod schema validation,
 * rate limit backoff retries, and one automatic retry with error feedback if schema validation fails.
 */
export async function callLlmJson<T>({
  systemPrompt,
  userPrompt,
  schema,
  model = MODEL,
  maxTokens = 2048,
}: CallLlmJsonOptions<T>): Promise<T> {
  let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Helper for 429 rate limit retry with backoff
  const callWithRateLimitRetry = async (
    msgs: OpenAI.Chat.ChatCompletionMessageParam[]
  ): Promise<string> => {
    const maxAttempts = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await llm.chat.completions.create({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          max_tokens: maxTokens,
          messages: msgs,
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw) {
          throw new Error("Empty response from LLM");
        }
        return raw;
      } catch (err: any) {
        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes("429") ||
          err?.message?.toLowerCase().includes("rate limit");

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(`[LLM] 429 Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
    throw new Error("Exceeded max retry attempts for LLM call.");
  };

  // First Attempt
  const firstRaw = await callWithRateLimitRetry(messages);

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(firstRaw);
  } catch (parseErr: any) {
    // If raw string isn't valid JSON, attempt one retry with feedback
    console.warn("[LLM] Raw response was not valid JSON, retrying once with error feedback...");
    const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...messages,
      { role: "assistant", content: firstRaw },
      {
        role: "user",
        content: `Your previous response was not valid JSON (Error: ${parseErr.message}). Return ONLY valid raw JSON matching the required schema. Do not enclose in markdown code blocks.`,
      },
    ];

    const retryRaw = await callWithRateLimitRetry(retryMessages);
    parsedJson = JSON.parse(retryRaw);
  }

  // Schema Validation
  const validationResult = schema.safeParse(parsedJson);

  if (validationResult.success) {
    return validationResult.data;
  }

  // Schema validation failed: Retry once with the exact validation error appended
  const errorDetails = validationResult.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("; ");

  console.warn(`[LLM] Schema validation failed (${errorDetails}). Retrying once with error feedback...`);

  const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...messages,
    { role: "assistant", content: JSON.stringify(parsedJson) },
    {
      role: "user",
      content: `Your previous JSON response did not match the required schema: ${errorDetails}. Please fix these issues and output ONLY valid JSON adhering strictly to the schema.`,
    },
  ];

  const secondRaw = await callWithRateLimitRetry(retryMessages);
  const secondJson = JSON.parse(secondRaw);
  const secondResult = schema.safeParse(secondJson);

  if (!secondResult.success) {
    throw new Error(
      `LLM output failed schema validation after retry: ${secondResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }

  return secondResult.data;
}
