// Database driver validation and connection utilities
// This module ensures all required drivers are available at runtime
import { loadDriverModule } from "./db-require";

interface DriverStatus {
  available: boolean;
  error?: string;
}

interface DriversStatus {
  pg: DriverStatus;
  mssql: DriverStatus;
  oracledb: DriverStatus;
}

const DRIVER_NAMES = {
  pg: "pg",
  mssql: "mssql",
  oracledb: "oracledb",
} as const;

let driversStatus: DriversStatus | null = null;

export function validateDrivers(): DriversStatus {
  if (driversStatus) {
    return driversStatus;
  }

  const status: DriversStatus = {
    pg: { available: false },
    mssql: { available: false },
    oracledb: { available: false },
  };

  try {
    loadDriverModule(DRIVER_NAMES.pg);
    status.pg = { available: true };
  } catch {
    status.pg = {
      available: false,
      error: `PostgreSQL driver (pg) is not installed. Run: npm install pg`,
    };
  }

  try {
    loadDriverModule(DRIVER_NAMES.mssql);
    status.mssql = { available: true };
  } catch {
    status.mssql = {
      available: false,
      error: `SQL Server driver (mssql) is not installed. Run: npm install mssql`,
    };
  }

  try {
    loadDriverModule(DRIVER_NAMES.oracledb);
    status.oracledb = { available: true };
  } catch {
    status.oracledb = {
      available: false,
      error: `Oracle driver (oracledb) is not installed. Run: npm install oracledb. Note: Oracle Instant Client 19+ must also be installed on the host.`,
    };
  }

  driversStatus = status;
  return status;
}

export function requireDriver(type: "postgres" | "sqlserver" | "oracle"): void {
  const status = validateDrivers();
  
  if (type === "postgres" && !status.pg.available) {
    throw new Error(
      `PostgreSQL driver (pg) is required but not available. ${status.pg.error || "Please install it."}`
    );
  }
  
  if (type === "sqlserver" && !status.mssql.available) {
    throw new Error(
      `SQL Server driver (mssql) is required but not available. ${status.mssql.error || "Please install it."}`
    );
  }
  
  if (type === "oracle" && !status.oracledb.available) {
    throw new Error(
      `Oracle driver (oracledb) is required but not available. ${status.oracledb.error || "Please install it."}`
    );
  }
}

export function getAllDriversStatus(): DriversStatus {
  return validateDrivers();
}

// Log driver status on module load (for server startup validation)
if (typeof window === "undefined") {
  const status = validateDrivers();
  const missing = Object.entries(status)
    .filter(([_, s]) => !s.available)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    console.error("⚠️  DATABASE DRIVERS MISSING:");
    missing.forEach((name) => {
      const driverStatus = status[name as keyof DriversStatus];
      console.error(`   - ${name}: ${driverStatus.error}`);
    });
    console.error("\n⚠️  Database connection tests will fail until drivers are installed.");
    console.error("   Run: npm install pg mssql oracledb");
    console.error("   For Oracle, also install Oracle Instant Client 19+ on the host.\n");
  } else {
    console.log("✓ All database drivers are available");
  }
}
