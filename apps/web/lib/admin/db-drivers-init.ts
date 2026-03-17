// This module ensures driver validation runs on server startup
// Import this in a server-side context to trigger validation

import { validateDrivers } from "./db-drivers";

// Validate drivers on import (server-side only)
if (typeof window === "undefined") {
  validateDrivers();
}

// Re-export for convenience
export { validateDrivers, requireDriver, getAllDriversStatus } from "./db-drivers";
