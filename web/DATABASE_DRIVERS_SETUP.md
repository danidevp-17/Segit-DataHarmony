# Database Drivers Setup Guide

This application supports connections to **PostgreSQL**, **SQL Server / Azure SQL**, and **Oracle 19+**. The Node.js drivers must be installed for connection validation and testing to work properly.

## Required Drivers

| Database                 | npm Package  | Default Port |
|--------------------------|--------------|--------------|
| PostgreSQL               | `pg`         | 5432         |
| SQL Server / Azure SQL   | `mssql`      | 1433         |
| Oracle 19+               | `oracledb`   | 1521         |

## Installation

```bash
cd web
npm install pg mssql oracledb
```

The drivers are already listed in `package.json`, so `npm install` will install them automatically.

### Corporate Certificate Issues

If you see `SELF_SIGNED_CERT_IN_CHAIN` errors during installation:

```bash
# Option 1: Corporate certificate
npm config set cafile /path/to/corporate-cert.pem

# Option 2: Disable strict SSL (not recommended for production)
npm config set strict-ssl false

# Option 3: Corporate npm registry
npm config set registry https://your-corporate-npm-registry.com
```

## Technical Architecture

### Driver Loading

Drivers are loaded using `createRequire` from the project root (`web/lib/admin/db-require.ts`), avoiding Turbopack/Next.js resolution issues with dynamic `require()`.

### Next.js Configuration

In `next.config.ts`, packages are declared as server externals so Node.js loads them natively:

```ts
serverExternalPackages: ["pg", "mssql", "oracledb"]
```

### Connection Storage

Connections created from the UI are stored in:

| Data           | File                        |
|----------------|-----------------------------|
| Configuration  | `web/data/datasources.json` |
| Passwords      | `web/data/secrets.json`     |

Passwords are stored separately under references like `ds_<id>_password`.

## Startup Validation

When the server starts, the application automatically validates that all drivers are available. You will see one of these messages in the console:

- `✓ All database drivers are available` — everything is working
- `⚠️ DATABASE DRIVERS MISSING:` — lists which drivers are missing and how to install them

## Configuration by Database Type

### PostgreSQL

No additional configuration required. Connects directly using the `pg` driver.

**Required fields:** Host, Port (5432), Database, Username, Password.

### SQL Server / Azure SQL

The connection uses TLS encryption (`encrypt: true`) by default, as required by Azure SQL and most modern servers.

**Required fields:** Host, Port (1433), Database, Username, Password.

**UI option:** "Use TLS encryption" checkbox (enabled by default). Disable it only if your server does not require encryption (e.g., local development environments).

The `trustServerCertificate` option is enabled to allow self-signed certificates.

### Oracle 19+

Oracle uses `oracledb` v6+ which runs in **Thin mode** by default (direct connection without Oracle Instant Client).

**Required fields:** Host, Port (1521), Service Name, Username, Password.

#### Error NJS-116: 10G Password Verifier Not Supported

If you see this error when connecting:

> NJS-116: password verifier type 0x939 is not supported by node-oracledb in Thin mode

This means the Oracle user has a legacy 10G password verifier that Thin mode does not support. There are two solutions:

**Solution 1** — Reset the password (recommended, no extra installation needed):

```sql
ALTER USER your_user IDENTIFIED BY new_password;
```

This generates an 11G+ verifier compatible with Thin mode.

**Solution 2** — Use Thick mode (requires Oracle Instant Client):

1. Download and install [Oracle Instant Client 19+](https://www.oracle.com/database/technologies/instant-client.html) (Basic or Basic Light package).
2. Create the file `web/.env.local` with the following variables:

```
ORACLE_USE_THICK_MODE=true
ORACLE_CLIENT_LIB_DIR=C:\oracle\instantclient_19_21
```

> Replace the path with the actual location of Oracle Instant Client (where `oci.dll` is on Windows or `libclntsh.so` on Linux).

3. Restart Next.js (`npm run dev`).

**Important:** Next.js loads `.env.local` automatically on startup. This method is more reliable than setting system environment variables, since Windows environment variables may not propagate to the Node.js process (especially if they were set after opening the terminal or Cursor).

#### Thick Mode Configuration by Platform

**Windows:**
```
ORACLE_USE_THICK_MODE=true
ORACLE_CLIENT_LIB_DIR=C:\oracle\instantclient_19_21
```

**Linux / WSL:**
```
ORACLE_USE_THICK_MODE=true
ORACLE_CLIENT_LIB_DIR=/opt/oracle/instantclient_19_21
```

On Linux, you can also set `LD_LIBRARY_PATH` before starting Node.js instead of using `ORACLE_CLIENT_LIB_DIR`.

**macOS:**
```
ORACLE_USE_THICK_MODE=true
ORACLE_CLIENT_LIB_DIR=/opt/oracle/instantclient_23_3
```

## Connection Testing from the UI

In **Admin → Datasources**:

1. Click **New Datasource**.
2. Select the database type (the port changes automatically to the default value).
3. Fill in the connection fields.
4. Click **Test Connection** to validate.
5. If the test is successful, click **Create** to save.

For existing datasources, use the play button in the table to re-test the connection.

## Troubleshooting

### "Cannot find module 'pg'" (or mssql / oracledb)

**Solution:** Run `npm install` in the `web/` directory.

### "DATABASE DRIVERS MISSING" on startup

**Cause:** Turbopack was using dynamic `require()` which could not resolve the modules. The current solution uses `createRequire` with static paths per driver.

**Solution:** Verify the packages are installed by running `npm ls pg mssql oracledb` in `web/`.

### SQL Server: "Server requires encryption"

**Solution:** Enable the "Use TLS encryption" checkbox in the connection form (it is enabled by default).

### Oracle: "NJS-116: password verifier type 0x939 is not supported"

**Solution:** See the "Error NJS-116" section above. Either reset the user password or enable Thick mode.

### Oracle: "DPI-1047: Cannot locate Oracle Client library"

**Solution:** Thick mode was enabled but Oracle Instant Client was not found. Verify:
- That Oracle Instant Client 19+ is installed and extracted.
- That `ORACLE_CLIENT_LIB_DIR` in `.env.local` points to the correct directory (where `oci.dll` / `libclntsh.so` is located).

### Oracle: "NJS-047: cannot load a node-oracledb binary"

**Solution:**
- Verify that Oracle Instant Client 19+ is installed.
- On Linux, verify that `LD_LIBRARY_PATH` includes the Instant Client directory.
- Restart the server after setting environment variables.

### Connection Test Timeout

**Possible causes:**
- The database server is not running.
- A firewall is blocking the connection.
- Incorrect host or port.
- Network connectivity issues.

The default timeout is 5 seconds for all database types.

### Certificate Errors During npm install

**Solution:** Configure npm to use your corporate certificate or registry (see "Corporate Certificate Issues" above).
