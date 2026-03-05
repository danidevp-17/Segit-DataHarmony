/**
 * Oracle Thick mode initialization.
 * Use Thick mode to support 10G password verifiers (NJS-116).
 *
 * Set ORACLE_USE_THICK_MODE=true and ORACLE_CLIENT_LIB_DIR to the path of Oracle Instant Client:
 *   Windows: C:\oracle\instantclient_23_5
 *   macOS:   /opt/oracle/instantclient_23_3
 *   Linux:   /opt/oracle/instantclient_19_21
 */

let thickInitialized = false;
let thickInitError: Error | null = null;

interface OracleDbModule {
  initOracleClient?: (opts?: { libDir?: string }) => void;
}

export function initOracleClientIfNeeded(oracledb: OracleDbModule): void {
  if (thickInitialized) return;
  if (thickInitError) throw thickInitError;

  const libDir = process.env.ORACLE_CLIENT_LIB_DIR?.trim();
  const useThick =
    process.env.ORACLE_USE_THICK_MODE === "true" ||
    process.env.ORACLE_USE_THICK_MODE === "1" ||
    !!libDir;

  if (!useThick) return;

  if (typeof oracledb.initOracleClient !== "function") return;

  try {
    const opts: { libDir?: string } = {};
    if (libDir) opts.libDir = libDir;
    oracledb.initOracleClient(opts);
    thickInitialized = true;
  } catch (err: unknown) {
    thickInitError = err instanceof Error ? err : new Error(String(err));
    const msg = thickInitError.message;
    if (msg.includes("DPI-1047") || msg.includes("Cannot locate")) {
      throw new Error(
        "Oracle Thick mode failed: Oracle Instant Client not found. " +
          "Install Oracle Instant Client 19+ and set ORACLE_CLIENT_LIB_DIR to its path. " +
          "On Linux, you can also set LD_LIBRARY_PATH."
      );
    }
    throw thickInitError;
  }
}
