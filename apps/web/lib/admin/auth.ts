import { promises as fs } from "fs";
import path from "path";

export type ActiveProvider = "google" | "azureAd" | "oidc" | "none";

export interface AuthConfig {
  activeProvider: ActiveProvider;
  baseUrl?: string;
  providers: {
    google: {
      clientId?: string;
      clientSecretRef?: string; // Reference to secret in secrets.json
      callbackUrl?: string;
    };
    azureAd: {
      clientId?: string;
      clientSecretRef?: string;
      tenantId?: string;
      issuer?: string; // Optional, can be built from tenantId
      callbackUrl?: string;
    };
    oidc: {
      clientId?: string;
      clientSecretRef?: string;
      issuer?: string;
      callbackUrl?: string;
    };
  };
}

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");

const defaultAuthConfig: AuthConfig = {
  activeProvider: "none",
  providers: {
    google: {},
    azureAd: {},
    oidc: {},
  },
};

export async function loadAuthConfig(): Promise<AuthConfig> {
  try {
    const raw = await fs.readFile(AUTH_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    // File doesn't exist, return defaults
    return defaultAuthConfig;
  }
}

export async function saveAuthConfig(config: AuthConfig): Promise<void> {
  await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
  await fs.writeFile(AUTH_PATH, JSON.stringify(config, null, 2), "utf-8");
}
