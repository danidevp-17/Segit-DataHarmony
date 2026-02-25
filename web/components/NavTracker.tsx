"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "segit:navDepth";
const BACK_FLAG_KEY = "segit:isGoingBack";
const MAX_DEPTH = 50;

export default function NavTracker() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Skip if pathname hasn't changed
    if (prevPathnameRef.current === pathname) {
      return;
    }

    // Check if we're going back (set by BackButton)
    const isGoingBack = sessionStorage.getItem(BACK_FLAG_KEY) === "true";
    if (isGoingBack) {
      // Clear the flag - depth was already adjusted by BackButton
      sessionStorage.removeItem(BACK_FLAG_KEY);
      prevPathnameRef.current = pathname;
      return;
    }

    // On initial mount, set depth to 1
    if (isInitialMount.current) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      prevPathnameRef.current = pathname;
      isInitialMount.current = false;
      return;
    }

    // Increment depth when navigating forward to a different page
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      const currentDepth = sessionStorage.getItem(STORAGE_KEY);
      const parsed = currentDepth ? parseInt(currentDepth, 10) : 1;
      const newDepth = Math.min((isNaN(parsed) ? 1 : parsed) + 1, MAX_DEPTH);
      sessionStorage.setItem(STORAGE_KEY, newDepth.toString());
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
