import { NormalizedRoutine } from "./sources/routines";

// Normalize text for matching
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// Calculate similarity score between query and routine
function calculateSimilarity(queryTokens: string[], routine: NormalizedRoutine): number {
  const routineTokens = new Set([
    ...normalize(routine.id),
    ...normalize(routine.name),
    ...normalize(routine.description),
  ]);
  
  let matches = 0;
  queryTokens.forEach((token) => {
    if (routineTokens.has(token)) {
      matches++;
    }
  });
  
  // Also check for partial matches (e.g., "fault" matches "addfaultname")
  queryTokens.forEach((token) => {
    if (routine.id.includes(token) || routine.name.toLowerCase().includes(token)) {
      matches += 0.5;
    }
  });
  
  // Normalize by query length
  return queryTokens.length > 0 ? matches / queryTokens.length : 0;
}

export function matchRoutine(
  userText: string,
  routines: NormalizedRoutine[]
): NormalizedRoutine | null {
  if (routines.length === 0) {
    return null;
  }
  
  const queryTokens = normalize(userText);
  
  let bestMatch: NormalizedRoutine | null = null;
  let bestScore = 0;
  const threshold = 0.2; // Minimum similarity threshold
  
  for (const routine of routines) {
    const score = calculateSimilarity(queryTokens, routine);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = routine;
    }
  }
  
  // Return match only if above threshold
  return bestScore >= threshold ? bestMatch : null;
}
