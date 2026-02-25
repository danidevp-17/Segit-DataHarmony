import { promises as fs } from "fs";
import path from "path";

export interface AccessPolicy {
  routineId: string;
  allowedDatasourceIds: string[];
}

export interface PoliciesData {
  routinePolicies: Record<string, string[]>; // { [routineId]: allowedDatasourceIds[] }
  modulePolicies: Record<string, string[]>;   // { [moduleId]: allowedDatasourceIds[] }
}

const POLICIES_PATH = path.join(process.cwd(), "data", "access-policies.json");

const defaultPolicies: PoliciesData = {
  routinePolicies: {},
  modulePolicies: {},
};

export async function loadPolicies(): Promise<PoliciesData> {
  try {
    const raw = await fs.readFile(POLICIES_PATH, "utf-8");
    const data = JSON.parse(raw);
    // Handle legacy format (array of AccessPolicy)
    if (Array.isArray(data)) {
      const routinePolicies: Record<string, string[]> = {};
      data.forEach((policy: AccessPolicy) => {
        routinePolicies[policy.routineId] = policy.allowedDatasourceIds;
      });
      return {
        routinePolicies,
        modulePolicies: {},
      };
    }
    // New format
    return {
      routinePolicies: data.routinePolicies || {},
      modulePolicies: data.modulePolicies || {},
    };
  } catch (err) {
    // File doesn't exist, return defaults
    return defaultPolicies;
  }
}

export async function savePolicies(policies: PoliciesData): Promise<void> {
  await fs.mkdir(path.dirname(POLICIES_PATH), { recursive: true });
  await fs.writeFile(POLICIES_PATH, JSON.stringify(policies, null, 2), "utf-8");
}

export async function getPolicyForRoutine(routineId: string): Promise<string[]> {
  const policies = await loadPolicies();
  return policies.routinePolicies[routineId] || [];
}

export async function getPolicyForModule(moduleId: string): Promise<string[]> {
  const policies = await loadPolicies();
  return policies.modulePolicies[moduleId] || [];
}

export async function getAllowedDatasourcesForRoutine(routineId: string): Promise<string[]> {
  return getPolicyForRoutine(routineId);
}

export async function getAllowedDatasourcesForModule(moduleId: string): Promise<string[]> {
  return getPolicyForModule(moduleId);
}

// Get intersection of module and routine policies
export async function getAllowedDatasourcesForRoutineInModule(
  routineId: string,
  moduleId: string
): Promise<string[]> {
  const routinePolicy = await getPolicyForRoutine(routineId);
  const modulePolicy = await getPolicyForModule(moduleId);
  
  // If module policy is empty, treat as "all" - return routine policy only
  if (modulePolicy.length === 0) {
    return routinePolicy;
  }
  
  // Return intersection
  return routinePolicy.filter((id) => modulePolicy.includes(id));
}

export async function savePolicy(policy: AccessPolicy): Promise<void> {
  const policies = await loadPolicies();
  policies.routinePolicies[policy.routineId] = policy.allowedDatasourceIds;
  await savePolicies(policies);
}
