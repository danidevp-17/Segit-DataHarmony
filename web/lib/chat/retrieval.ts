import { promises as fs } from "fs";
import path from "path";

interface FAQ {
  question: string;
  answer: string;
}

interface RetrievalResult {
  type: "faq" | "portal";
  content: string;
  score: number;
}

// Synonym mapping for common typos and variations
const synonyms: Record<string, string> = {
  "ow routines": "geology and geophysics",
  "ow routine": "geology and geophysics",
  "rutines": "routines",
  "rutine": "routine",
  "dataquaility": "data quality",
  "data quaility": "data quality",
  "dataqual": "data quality",
  "cartog": "cartography",
  "cartograpy": "cartography",
  "dril": "drilling",
  "drilng": "drilling",
};

// Normalize query with synonyms
function normalizeWithSynonyms(text: string): string {
  let normalized = text.toLowerCase();
  
  // Apply synonym replacements
  for (const [synonym, replacement] of Object.entries(synonyms)) {
    const regex = new RegExp(synonym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    normalized = normalized.replace(regex, replacement);
  }
  
  return normalized;
}

// Simple tokenization (split by whitespace and punctuation)
function tokenize(text: string): string[] {
  const normalized = normalizeWithSynonyms(text);
  return normalized
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// Calculate overlap score between query and text
function calculateScore(queryTokens: string[], textTokens: string[]): number {
  const querySet = new Set(queryTokens);
  const textSet = new Set(textTokens);
  
  let matches = 0;
  querySet.forEach((token) => {
    if (textSet.has(token)) {
      matches++;
    }
  });
  
  // Normalize by query length
  return querySet.size > 0 ? matches / querySet.size : 0;
}

// Load FAQs from JSON file
async function loadFAQs(): Promise<FAQ[]> {
  try {
    const kbPath = path.join(process.cwd(), "lib", "kb", "faq.json");
    const content = await fs.readFile(kbPath, "utf-8");
    return JSON.parse(content) as FAQ[];
  } catch (error) {
    console.error("Error loading FAQs:", error);
    return [];
  }
}

// Load portal.md content
async function loadPortalContent(): Promise<string> {
  try {
    const kbPath = path.join(process.cwd(), "lib", "kb", "portal.md");
    return await fs.readFile(kbPath, "utf-8");
  } catch (error) {
    console.error("Error loading portal.md:", error);
    return "";
  }
}

// Split portal content into sections (by headers)
function splitPortalIntoSections(content: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = content.split("\n");
  
  let currentTitle = "Overview";
  let currentContent: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join("\n"),
        });
      }
      currentTitle = line.replace(/^##\s+/, "");
      currentContent = [];
    } else if (line.startsWith("### ")) {
      if (currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join("\n"),
        });
      }
      currentTitle = line.replace(/^###\s+/, "");
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  
  if (currentContent.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentContent.join("\n"),
    });
  }
  
  return sections;
}

export async function retrieveRelevantContent(
  query: string
): Promise<RetrievalResult | null> {
  // Normalize query with synonyms first
  const normalizedQuery = normalizeWithSynonyms(query);
  const queryTokens = tokenize(normalizedQuery);
  
  // Try to match FAQs first
  const faqs = await loadFAQs();
  let bestFAQ: FAQ | null = null;
  let bestFAQScore = 0;
  
  for (const faq of faqs) {
    const questionTokens = tokenize(faq.question);
    const answerTokens = tokenize(faq.answer);
    const questionScore = calculateScore(queryTokens, questionTokens);
    const answerScore = calculateScore(queryTokens, answerTokens);
    const combinedScore = questionScore * 1.5 + answerScore * 0.5; // Weight question more
    
    if (combinedScore > bestFAQScore) {
      bestFAQScore = combinedScore;
      bestFAQ = faq;
    }
  }
  
  // If FAQ score is good enough, return it
  if (bestFAQ && bestFAQScore > 0.2) {
    return {
      type: "faq",
      content: bestFAQ.answer,
      score: bestFAQScore,
    };
  }
  
  // Fallback to portal.md sections
  const portalContent = await loadPortalContent();
  const sections = splitPortalIntoSections(portalContent);
  
  let bestSection: { title: string; content: string } | null = null;
  let bestSectionScore = 0;
  
  for (const section of sections) {
    const sectionTokens = tokenize(section.title + " " + section.content);
    const score = calculateScore(queryTokens, sectionTokens);
    
    if (score > bestSectionScore) {
      bestSectionScore = score;
      bestSection = section;
    }
  }
  
  if (bestSection && bestSectionScore > 0.1) {
    return {
      type: "portal",
      content: bestSection.content.trim(),
      score: bestSectionScore,
    };
  }
  
  // Return a default helpful message if nothing matches
  return {
    type: "portal",
    content: "I can help you with questions about DataHarmony Automation Hub. Try asking about available modules, how to run routines, viewing job logs, or configuring settings.",
    score: 0,
  };
}
