import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "mssql", "oracledb", "mammoth", "xlsx", "jszip"],
};

export default nextConfig;
