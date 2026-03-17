import { retrieveRelevantContent } from "../retrieval";
import { detectIntent } from "../intents";
import { matchRoutine } from "../entities";
import { getRoutines, NormalizedRoutine } from "../sources/routines";

// Map keywords to routes
const routeMap: Record<string, string> = {
  routine: "/routines",
  routines: "/routines",
  job: "/jobs",
  jobs: "/jobs",
  setting: "/settings",
  settings: "/settings",
  production: "/production",
  drilling: "/drilling",
  cartography: "/cartography",
  "data quality": "/data-quality",
  chat: "/chat",
  home: "/",
};

function extractRoutes(text: string): string[] {
  const lowerText = text.toLowerCase();
  const routes: string[] = [];
  
  for (const [keyword, route] of Object.entries(routeMap)) {
    if (lowerText.includes(keyword)) {
      routes.push(route);
    }
  }
  
  // Remove duplicates
  return [...new Set(routes)];
}

function formatListRoutines(routines: NormalizedRoutine[], limit: number = 5): string {
  if (routines.length === 0) {
    return "No routines are currently available.";
  }
  
  const displayRoutines = routines.slice(0, limit);
  let answer = `Available routines:\n\n`;
  
  displayRoutines.forEach((routine) => {
    answer += `• ${routine.name} (${routine.id})\n  ${routine.description}\n\n`;
  });
  
  if (routines.length > limit) {
    answer += `... and ${routines.length - limit} more routine${routines.length - limit > 1 ? "s" : ""}\n\n`;
  }
  
  answer += `Browse all routines at: /routines`;
  
  return answer;
}

function formatHowItWorks(combined: boolean = false): string {
  let answer = `How routines work:\n\n`;
  
  if (combined) {
    answer += `Here's the workflow for using routines:\n\n`;
  }
  
  answer += `1. Select a routine - Go to /routines and choose a routine from the catalog\n`;
  answer += `2. Fill parameters - Enter required parameters (like District, Project Data, etc.)\n`;
  answer += `3. Upload files - If the routine requires files, upload them using the file inputs\n`;
  answer += `4. Run - Click submit to create and start the job\n`;
  answer += `5. Monitor - Track progress in /jobs:\n`;
  answer += `   - View job status (running, completed, failed)\n`;
  answer += `   - Check logs at /jobs/[id] (stdout/stderr tabs)\n`;
  answer += `   - Download artifacts when the job completes\n\n`;
  
  answer += `Relevant pages: /routines, /jobs`;
  
  return answer;
}

function formatRoutineDetails(routine: NormalizedRoutine): string {
  let answer = `${routine.name} (${routine.id})\n\n`;
  answer += `${routine.description}\n\n`;
  
  if (routine.params.length > 0) {
    answer += `Required parameters:\n`;
    routine.params.forEach((param) => {
      answer += `• ${param.label} (${param.key})${param.required ? " *required" : ""}\n`;
    });
    answer += `\n`;
  } else {
    answer += `Parameters: None required\n\n`;
  }
  
  if (routine.fileInputs.length > 0) {
    answer += `File inputs:\n`;
    routine.fileInputs.forEach((input) => {
      answer += `• ${input.label}${input.accept ? ` (${input.accept})` : ""}${input.multiple ? " - multiple files" : ""}\n`;
    });
    answer += `\n`;
  } else {
    answer += `File inputs: None required\n\n`;
  }
  
  answer += `Workflow:\n`;
  answer += `1. Go to /routines/${routine.id} to run this routine\n`;
  answer += `2. Fill in the parameters and upload files as needed\n`;
  answer += `3. Submit to create a job\n`;
  answer += `4. Monitor the job at /jobs and view logs/artifacts at /jobs/[id]\n\n`;
  
  answer += `Relevant pages: /routines/${routine.id}, /jobs`;
  
  return answer;
}

function formatAnswer(retrievedContent: string, query: string): string {
  const routes = extractRoutes(query + " " + retrievedContent);
  
  let answer = retrievedContent;
  
  // Add route links if relevant
  if (routes.length > 0) {
    answer += "\n\n";
    if (routes.length === 1) {
      answer += `You can access this at: ${routes[0]}`;
    } else {
      answer += "Relevant pages:\n";
      routes.forEach((route) => {
        answer += `- ${route}\n`;
      });
    }
  }
  
  return answer;
}

type AnswerOptions = { language?: "en" | "es" };

export async function answer(
  messages: Array<{ role: string; content: string }>,
  _options?: AnswerOptions
): Promise<string> {
  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return "I'm here to help! What would you like to know about DataHarmony Automation Hub?";
  }
  
  const query = lastMessage.content;
  
  // Detect intent
  const intentResult = detectIntent(query);
  const intent = intentResult.intent;
  
  // Handle routine-specific intents
  if (intent === "LIST_ROUTINES" || intent === "ROUTINE_DETAILS" || intent === "HOW_IT_WORKS") {
    const routines = await getRoutines();
    
    // Try to match a specific routine first
    const matchedRoutine = matchRoutine(query, routines);
    
    if (intent === "ROUTINE_DETAILS" && matchedRoutine) {
      return formatRoutineDetails(matchedRoutine);
    }
    
    if (intent === "LIST_ROUTINES") {
      let answer = formatListRoutines(routines);
      
      // If combined with how-it-works, add workflow info
      if (intentResult.combined) {
        answer += `\n\n${formatHowItWorks(true)}`;
      }
      
      return answer;
    }
    
    if (intent === "HOW_IT_WORKS") {
      return formatHowItWorks(intentResult.combined);
    }
  }
  
  // Fallback to KB retrieval for other questions
  const result = await retrieveRelevantContent(query);
  
  if (!result) {
    return "I couldn't find specific information about that. Try asking about available modules, how to run routines, or viewing job logs.";
  }
  
  // Format the answer
  return formatAnswer(result.content, query);
}
