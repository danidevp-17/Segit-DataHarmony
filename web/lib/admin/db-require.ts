import { createRequire } from "node:module";
import path from "node:path";

/**
 * Require for DB drivers. Uses createRequire to resolve from project root,
 * bypassing Turbopack/Next.js resolution quirks when require() fails in the bundle.
 */
const requireFromProject = createRequire(
  path.join(process.cwd(), "package.json")
);

export function loadDriverModule(moduleName: string): unknown {
  switch (moduleName) {
    case "pg":
      return requireFromProject("pg");
    case "mssql":
      return requireFromProject("mssql");
    case "oracledb":
      return requireFromProject("oracledb");
    default:
      throw new Error(`Unknown driver module: ${moduleName}`);
  }
}
