# Quick Start: Install Database Drivers

## Installation Command

```bash
cd web
npm install pg mssql oracledb
```

## If npm install fails due to certificates:

1. **Option 1**: Configure npm to trust your corporate certificate
   ```bash
   npm config set cafile /path/to/corporate-cert.pem
   npm install pg mssql oracledb
   ```

2. **Option 2**: Use your corporate npm registry
   ```bash
   npm config set registry https://your-corporate-npm-registry.com
   npm install pg mssql oracledb
   ```

3. **Option 3**: Install packages manually from your internal repository

## After Installation

1. Restart your Next.js development server
2. Check the console for driver validation messages
3. You should see: `✓ All database drivers are available`

## Oracle Additional Setup

If using Oracle, also install Oracle Instant Client 19+:

- **Linux/WSL**: Set `LD_LIBRARY_PATH=/opt/oracle/instantclient_19_21`
- **Windows**: Add Instant Client directory to PATH

See `DATABASE_DRIVERS_SETUP.md` for detailed instructions.
