"use client";

import { useState, useEffect } from "react";
import { getPinnedModules, pinModule, unpinModule, isPinned } from "./pins";

/**
 * React hook for managing pinned modules
 * Provides reactive state and syncs with localStorage and cross-tab events
 */
export function usePinnedModules() {
  const [pinned, setPinned] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      return getPinnedModules();
    }
    return [];
  });

  useEffect(() => {
    // Listen for storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "segit:pinnedModules") {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(newValue)) {
            setPinned(newValue);
          }
        } catch (error) {
          console.error("Error parsing storage event:", error);
        }
      }
    };

    // Listen for custom events (same-tab updates)
    const handleCustomChange = (e: CustomEvent<string[]>) => {
      setPinned(e.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pinnedModulesChanged", handleCustomChange as EventListener);

    // Initial load
    setPinned(getPinnedModules());

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pinnedModulesChanged", handleCustomChange as EventListener);
    };
  }, []);

  const pin = (id: string) => {
    pinModule(id);
    setPinned(getPinnedModules());
  };

  const unpin = (id: string) => {
    unpinModule(id);
    setPinned(getPinnedModules());
  };

  const checkIsPinned = (id: string) => {
    return pinned.includes(id);
  };

  return {
    pinned,
    pin,
    unpin,
    isPinned: checkIsPinned,
  };
}
