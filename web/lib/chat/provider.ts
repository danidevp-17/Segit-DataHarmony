import { answer as basicAnswer } from "./providers/basic";
import { answer as llmAnswer } from "./providers/llm";

export type AnswerOptions = { language?: "en" | "es" };

export async function answer(
  messages: Array<{ role: string; content: string }>,
  options?: AnswerOptions
): Promise<string> {
  const language = options?.language ?? "en";

  // Check if OpenAI API key is available
  if (process.env.OPENAI_API_KEY) {
    return llmAnswer(messages, { language });
  }

  // Use basic provider (no key required)
  return basicAnswer(messages, { language });
}
