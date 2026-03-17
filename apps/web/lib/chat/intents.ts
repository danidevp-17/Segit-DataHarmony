export type Intent = "LIST_ROUTINES" | "HOW_IT_WORKS" | "ROUTINE_DETAILS" | "UNKNOWN";

interface IntentResult {
  intent: Intent;
  combined?: boolean; // true if multiple intents detected
}

// Normalize text for matching
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ");
}

// Check if text contains keywords
function hasKeywords(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function detectIntent(userText: string): IntentResult {
  const normalized = normalize(userText);
  
  // Keywords for listing routines
  const listKeywords = [
    "list",
    "show",
    "what routines",
    "which routines",
    "available routines",
    "routines are",
    "routines have",
    "routines in",
    "routines available",
    "all routines",
    "see routines",
    "browse routines",
  ];
  
  // Keywords for how it works
  const howKeywords = [
    "how",
    "how to",
    "how do",
    "how does",
    "work",
    "works",
    "workflow",
    "process",
    "steps",
    "procedure",
    "run",
    "execute",
    "use",
    "using",
  ];
  
  // Keywords for routine details
  const detailKeywords = [
    "details",
    "detail",
    "info",
    "information",
    "about",
    "what is",
    "what does",
    "parameters",
    "params",
    "files",
    "inputs",
    "required",
  ];
  
  const hasList = hasKeywords(userText, listKeywords);
  const hasHow = hasKeywords(userText, howKeywords);
  const hasDetail = hasKeywords(userText, detailKeywords);
  
  // Check for routine name mentions (common patterns)
  const hasRoutineMention = /(routine|script|tool|function)\s+["']?(\w+)/i.test(userText);
  
  // Combined intent: listing + how-to
  if (hasList && hasHow) {
    return { intent: "LIST_ROUTINES", combined: true };
  }
  
  // Combined intent: details + how-to
  if (hasDetail && hasHow && hasRoutineMention) {
    return { intent: "ROUTINE_DETAILS", combined: true };
  }
  
  // Single intents
  if (hasList) {
    return { intent: "LIST_ROUTINES" };
  }
  
  if (hasHow && hasRoutineMention) {
    return { intent: "ROUTINE_DETAILS" };
  }
  
  if (hasHow) {
    return { intent: "HOW_IT_WORKS" };
  }
  
  if (hasDetail && hasRoutineMention) {
    return { intent: "ROUTINE_DETAILS" };
  }
  
  return { intent: "UNKNOWN" };
}
