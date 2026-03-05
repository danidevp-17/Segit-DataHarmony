// Real database connection testing using installed drivers
import { requireDriver } from "./db-drivers";
import { initOracleClientIfNeeded } from "./db-oracle-thick";
import { loadDriverModule } from "./db-require";
// Import to trigger driver validation on server startup
import "./db-drivers-init";

export interface TestPayload {
  type: "postgres" | "sqlserver" | "oracle";
  host: string;
  port: number;
  database?: string;
  serviceName?: string;
  username: string;
  password: string;
  options?: Record<string, any>;
}

export interface TestResult {
  ok: boolean;
  message: string;
  details?: string;
  errorCode?: string;
}

async function testPostgreSQL(payload: TestPayload): Promise<TestResult> {
  requireDriver("postgres");
  const pg = loadDriverModule("pg") as { Client: new (config: any) => any };
  const { Client } = pg;
  
  const client = new Client({
    host: payload.host,
    port: payload.port,
    database: payload.database,
    user: payload.username,
    password: payload.password,
    connectionTimeoutMillis: 5000,
    ...payload.options,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    
    return {
      ok: true,
      message: "Connection validated successfully (PostgreSQL)",
    };
  } catch (error: any) {
    // Clean up on error
    try {
      await client.end();
    } catch {
      // Ignore cleanup errors
    }
    
    // Extract meaningful error message
    let message = "PostgreSQL connection failed";
    let details = error.message || "Unknown error";
    let errorCode = "DB_CONNECTION_ERROR";
    
    if (error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) {
      message = "Connection timeout";
      details = "The database server did not respond within 5 seconds. Check network connectivity and firewall rules.";
      errorCode = "TIMEOUT";
    } else if (error.message?.includes("password") || error.message?.includes("authentication")) {
      message = "Authentication failed";
      details = error.message;
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      message = "DNS resolution failed";
      details = `Cannot resolve hostname "${payload.host}". Check the hostname.`;
      errorCode = "DNS_ERROR";
    } else if (error.message?.includes("ECONNREFUSED")) {
      message = "Connection refused";
      details = `The database server at ${payload.host}:${payload.port} refused the connection. Check if the server is running and accessible.`;
      errorCode = "CONNECTION_REFUSED";
    } else if (error.message?.includes("database") && error.message?.includes("does not exist")) {
      message = "Database not found";
      details = error.message;
      errorCode = "DATABASE_NOT_FOUND";
    } else {
      details = error.message || "Unknown error";
    }
    
    return {
      ok: false,
      message,
      details,
      errorCode,
    };
  }
}

async function testSQLServer(payload: TestPayload): Promise<TestResult> {
  requireDriver("sqlserver");
  const sql = loadDriverModule("mssql") as {
    connect: (config: any) => Promise<any>;
  };
  
  const config = {
    server: payload.host,
    port: payload.port,
    database: payload.database,
    user: payload.username,
    password: payload.password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      connectTimeout: 5000,
      ...payload.options,
    },
  };

  let pool: any = null;
  
  try {
    pool = await sql.connect(config);
    await pool.request().query("SELECT 1");
    await pool.close();
    
    return {
      ok: true,
      message: "Connection validated successfully (SQL Server)",
    };
  } catch (error: any) {
    // Clean up on error
    if (pool) {
      try {
        await pool.close();
      } catch {
        // Ignore cleanup errors
      }
    }
    
    // Extract meaningful error message
    let message = "SQL Server connection failed";
    let details = error.message || "Unknown error";
    let errorCode = "DB_CONNECTION_ERROR";
    
    if (error.message?.includes("timeout") || error.code === "ETIMEOUT") {
      message = "Connection timeout";
      details = "The database server did not respond within 5 seconds. Check network connectivity and firewall rules.";
      errorCode = "TIMEOUT";
    } else if (error.message?.includes("Login failed") || error.message?.includes("password") || error.message?.includes("authentication")) {
      message = "Authentication failed";
      details = error.message;
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      message = "DNS resolution failed";
      details = `Cannot resolve hostname "${payload.host}". Check the hostname.`;
      errorCode = "DNS_ERROR";
    } else if (error.message?.includes("ECONNREFUSED")) {
      message = "Connection refused";
      details = `The database server at ${payload.host}:${payload.port} refused the connection. Check if the server is running and accessible.`;
      errorCode = "CONNECTION_REFUSED";
    } else if (error.message?.includes("database") && error.message?.includes("not found")) {
      message = "Database not found";
      details = error.message;
      errorCode = "DATABASE_NOT_FOUND";
    } else {
      details = error.message || "Unknown error";
    }
    
    return {
      ok: false,
      message,
      details,
      errorCode,
    };
  }
}

async function testOracle(payload: TestPayload): Promise<TestResult> {
  requireDriver("oracle");
  const oracledb = loadDriverModule("oracledb") as {
    initOracleClient?: (opts?: { libDir?: string }) => void;
    getConnection: (options: any) => Promise<any>;
  };
  initOracleClientIfNeeded(oracledb);

  const connectString = payload.serviceName
    ? `${payload.host}:${payload.port}/${payload.serviceName}`
    : `${payload.host}:${payload.port}`;

  let connection: any = null;
  
  try {
    connection = await oracledb.getConnection({
      user: payload.username,
      password: payload.password,
      connectString,
      ...payload.options,
    });
    
    // Set timeout for query
    await Promise.race([
      connection.execute("SELECT 1 FROM dual"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 5000)
      ),
    ]);
    
    await connection.close();
    
    return {
      ok: true,
      message: "Connection validated successfully (Oracle)",
    };
  } catch (error: any) {
    // Clean up on error
    if (connection) {
      try {
        await connection.close();
      } catch {
        // Ignore cleanup errors
      }
    }
    
    // Extract meaningful error message
    let message = "Oracle connection failed";
    let details = error.message || "Unknown error";
    let errorCode = "DB_CONNECTION_ERROR";
    
    if (error.message?.includes("timeout") || error.message?.includes("Query timeout")) {
      message = "Connection timeout";
      details = "The database server did not respond within 5 seconds. Check network connectivity and firewall rules.";
      errorCode = "TIMEOUT";
    } else if (error.message?.includes("ORA-01017") || error.message?.includes("ORA-1017") || error.message?.includes("invalid username/password")) {
      message = "Authentication failed";
      details = "Invalid username or password";
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("ORA-12541") || error.message?.includes("TNS:no listener")) {
      message = "Connection refused";
      details = `No listener found at ${payload.host}:${payload.port}. Check if the Oracle server is running and the service name is correct.`;
      errorCode = "CONNECTION_REFUSED";
    } else if (error.message?.includes("ORA-12154") || error.message?.includes("TNS:could not resolve")) {
      message = "Service name resolution failed";
      details = `Cannot resolve service name "${payload.serviceName}". Check the service name.`;
      errorCode = "SERVICE_NOT_FOUND";
    } else if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      message = "DNS resolution failed";
      details = `Cannot resolve hostname "${payload.host}". Check the hostname.`;
      errorCode = "DNS_ERROR";
    } else if (error.message?.includes("NJS-116") || error.message?.includes("password verifier") || error.message?.includes("0x939")) {
      message = "Password verifier 10G no soportado";
      details =
        "El usuario Oracle usa un verificador de contraseña 10G legacy. Thin mode no lo soporta. " +
        "Solución 1: Pide a tu DBA que resetee la contraseña: ALTER USER usuario IDENTIFIED BY nueva_contraseña; " +
        "Solución 2: Usa Thick mode: instala Oracle Instant Client 19+, define ORACLE_CLIENT_LIB_DIR y ORACLE_USE_THICK_MODE=true. Ver DATABASE_DRIVERS_SETUP.md.";
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("DPI-1047") || error.message?.includes("Oracle Instant Client not found")) {
      message = "Oracle Instant Client no encontrado";
      details =
        error.message ||
        "Instala Oracle Instant Client 19+ y define ORACLE_CLIENT_LIB_DIR. Ver DATABASE_DRIVERS_SETUP.md.";
      errorCode = "DRIVER_ERROR";
    } else if (error.message?.includes("ORA-") || error.message?.includes("TNS:")) {
      // Oracle-specific error codes
      message = "Oracle connection error";
      details = error.message;
      errorCode = "ORACLE_ERROR";
    } else {
      details = error.message || "Unknown error";
    }
    
    return {
      ok: false,
      message,
      details,
      errorCode,
    };
  }
}

export async function testDatabaseConnection(payload: TestPayload): Promise<TestResult> {
  // Validate required fields
  if (!payload.type || !payload.host || !payload.port || !payload.username || !payload.password) {
    return {
      ok: false,
      message: "Missing required fields",
      details: "type, host, port, username, and password are required",
      errorCode: "INVALID_CONFIG",
    };
  }

  // Validate type-specific fields
  if (payload.type === "oracle" && !payload.serviceName) {
    return {
      ok: false,
      message: "Oracle datasource requires serviceName",
      errorCode: "INVALID_CONFIG",
    };
  }

  if (payload.type !== "oracle" && !payload.database) {
    return {
      ok: false,
      message: `${payload.type} datasource requires database`,
      errorCode: "INVALID_CONFIG",
    };
  }

  // Test based on type
  try {
    if (payload.type === "postgres") {
      return await testPostgreSQL(payload);
    } else if (payload.type === "sqlserver") {
      return await testSQLServer(payload);
    } else if (payload.type === "oracle") {
      return await testOracle(payload);
    } else {
      return {
        ok: false,
        message: `Unsupported database type: ${payload.type}`,
        errorCode: "INVALID_CONFIG",
      };
    }
  } catch (error: any) {
    // Handle driver requirement errors
    if (error.message?.includes("is required but not available")) {
      return {
        ok: false,
        message: error.message,
        errorCode: "DRIVER_MISSING",
      };
    }
    
    return {
      ok: false,
      message: `Connection test failed: ${error.message || "Unknown error"}`,
      errorCode: "INTERNAL_ERROR",
    };
  }
}
