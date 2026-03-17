const KEY = "segit:pinnedModules";

/**
 * Get pinned module IDs from localStorage
 * @returns Array of pinned module IDs, defaults to empty array
 */
export function getPinnedModules(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Error reading pinned modules:", error);
    return [];
  }
}

/**
 * Pin a module by ID
 */
export function pinModule(id: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = getPinnedModules();
    if (!current.includes(id)) {
      const updated = [...current, id];
      localStorage.setItem(KEY, JSON.stringify(updated));
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent("pinnedModulesChanged", { detail: updated }));
    }
  } catch (error) {
    console.error("Error pinning module:", error);
  }
}

/**
 * Unpin a module by ID
 */
export function unpinModule(id: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = getPinnedModules();
    const updated = current.filter((moduleId) => moduleId !== id);
    localStorage.setItem(KEY, JSON.stringify(updated));
    // Dispatch custom event for cross-tab sync
    window.dispatchEvent(new CustomEvent("pinnedModulesChanged", { detail: updated }));
  } catch (error) {
    console.error("Error unpinning module:", error);
  }
}

/**
 * Check if a module is pinned
 */
export function isPinned(id: string): boolean {
  return getPinnedModules().includes(id);
}
