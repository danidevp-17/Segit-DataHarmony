import { retrieveRelevantContent } from "../retrieval";

type AnswerOptions = { language?: "en" | "es" };

export async function answer(
  messages: Array<{ role: string; content: string }>,
  options?: AnswerOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const language = options?.language ?? "en";

  if (!apiKey) {
    // Fallback to basic provider if no key
    const { answer: basicAnswer } = await import("./basic");
    return basicAnswer(messages, { language });
  }

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return "I'm here to help! What would you like to know about DataHarmony Automation Hub?";
  }

  const query = lastMessage.content;

  // Retrieve relevant content first
  const result = await retrieveRelevantContent(query);
  const context =
    result?.content ||
    "DataHarmony Automation Hub is a portal for managing operational routines and automation modules.";

  const languageInstruction =
    language === "es"
      ? " Always respond in Spanish (Español)."
      : " Respond in English.";

  try {
    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant for DataHarmony Automation Hub. Use the following context to answer questions accurately and concisely. If the context doesn't contain the answer, say so politely.${languageInstruction}

Context: ${context}`,
          },
          ...messages.slice(-5), // Last 5 messages for context
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("LLM provider error:", error);
    // Fallback to basic provider on error
    const { answer: basicAnswer } = await import("./basic");
    return basicAnswer(messages, { language });
  }
}
