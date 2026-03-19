import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "mssql", "oracledb", "mammoth", "xlsx", "jszip"],
  async redirects() {
    return [
      { source: "/routines", destination: "/gyg/routines", permanent: true },
      { source: "/routines/:id", destination: "/gyg/:id", permanent: true },
    ];
  },
};

export default nextConfig;
