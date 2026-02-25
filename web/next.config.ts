import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "mssql", "oracledb"],
};

export default nextConfig;
