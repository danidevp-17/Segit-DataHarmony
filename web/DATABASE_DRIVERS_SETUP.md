# Database Drivers Setup Guide

This application requires database drivers to be installed for datasource connection testing and validation.

## Required Drivers

The following Node.js packages must be installed:

- **PostgreSQL**: `pg`
- **SQL Server / Azure SQL**: `mssql`
- **Oracle 19+**: `oracledb`

## Installation

### Standard Installation

```bash
cd web
npm install pg mssql oracledb
```

### If You Encounter Certificate Issues

If you see `SELF_SIGNED_CERT_IN_CHAIN` errors, you may need to:

1. Configure npm to use your corporate certificate:
   ```bash
   npm config set cafile /path/to/corporate-cert.pem
   ```

2. Or disable strict SSL (not recommended for production):
   ```bash
   npm config set strict-ssl false
   ```

3. Or use a corporate npm registry:
   ```bash
   npm config set registry https://your-corporate-npm-registry.com
   ```

## Oracle Instant Client Setup

If you plan to use Oracle databases, you **must** also install Oracle Instant Client 19+ on the host system.

### Linux / WSL

1. Download Oracle Instant Client 19+ from Oracle's website
2. Extract to `/opt/oracle/instantclient_19_21` (or your preferred location)
3. Set environment variable:
   ```bash
   export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_21:$LD_LIBRARY_PATH
   ```
4. Add to your shell profile (`~/.bashrc` or `~/.zshrc`) to make it permanent

### Windows

1. Download Oracle Instant Client 19+ from Oracle's website
2. Extract to `C:\oracle\instantclient_19_21` (or your preferred location)
3. Add to system PATH:
   - Open System Properties → Environment Variables
   - Add `C:\oracle\instantclient_19_21` to PATH
   - Or set in PowerShell:
     ```powershell
     $env:PATH = "C:\oracle\instantclient_19_21;$env:PATH"
     ```

## Verification

After installation, restart your Next.js server. The application will automatically validate driver availability on startup.

You should see one of these messages in the console:

- ✅ **Success**: `✓ All database drivers are available`
- ⚠️ **Warning**: `⚠️  DATABASE DRIVERS MISSING:` (with details)

## Driver Validation

The application validates drivers on server startup. If a driver is missing:

1. The server will log a clear error message
2. Connection tests for that database type will fail with a helpful error
3. The error message will include installation instructions

## Testing

Once drivers are installed, you can test datasource connections in the Admin → Datasources UI:

1. Fill in the datasource configuration
2. Click "Test Connection"
3. The system will perform a real database connection test using the appropriate driver
4. You'll see clear success or error messages

## Troubleshooting

### "Cannot find module 'pg'" (or mssql/oracledb)

**Solution**: Run `npm install pg mssql oracledb` in the `web/` directory

### Oracle: "NJS-047: cannot load a node-oracledb binary"

**Solution**: 
- Ensure Oracle Instant Client 19+ is installed
- Verify `LD_LIBRARY_PATH` (Linux) or `PATH` (Windows) includes the Instant Client directory
- Restart the Node.js server after setting environment variables

### Connection tests fail with timeout

**Possible causes**:
- Database server is not running
- Firewall blocking the connection
- Incorrect host/port
- Network connectivity issues

Check the error message for specific details.

### Certificate errors during npm install

**Solution**: Configure npm to use your corporate certificate or registry (see "If You Encounter Certificate Issues" above)
