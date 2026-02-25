/**
 * Dynamic require for DB drivers so the bundler does not resolve them at build time.
 * This allows the app to build when pg/mssql/oracledb are not installed;
 * at runtime, missing drivers are reported via validateDrivers / requireDriver.
 */
export function loadDriverModule(moduleName: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(moduleName);
}
