// Shared test logic for auth configuration validation

interface TestPayload {
  provider: "google" | "azureAd" | "oidc";
  baseUrl?: string;
  issuer?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TestResponse {
  ok: boolean;
  message: string;
  details?: string | Record<string, string>;
  errorCode?: "DNS" | "TIMEOUT" | "HTTP" | "INVALID_METADATA" | "MISSING_FIELD";
}

async function fetchWithTimeout(url: string, timeout: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}

async function testOIDCDiscovery(issuer: string): Promise<TestResponse> {
  try {
    // Normalize issuer URL (remove trailing slash)
    const normalizedIssuer = issuer.replace(/\/$/, "");
    const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;

    let response: Response;
    try {
      response = await fetchWithTimeout(discoveryUrl, 10000);
    } catch (error: any) {
      if (error.message === "Request timeout") {
        return {
          ok: false,
          message: `Connection timeout while fetching discovery document from ${discoveryUrl}`,
          errorCode: "TIMEOUT",
        };
      }
      if (error.message?.includes("getaddrinfo") || error.message?.includes("ENOTFOUND")) {
        return {
          ok: false,
          message: `DNS resolution failed for issuer "${issuer}". Check the issuer URL.`,
          errorCode: "DNS",
        };
      }
      return {
        ok: false,
        message: `Failed to fetch discovery document: ${error.message || "Network error"}`,
        errorCode: "HTTP",
      };
    }

    if (!response.ok) {
      if (response.status === 404) {
        return {
          ok: false,
          message: `Discovery document not found at ${discoveryUrl}. Check the issuer URL.`,
          errorCode: "HTTP",
          details: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return {
        ok: false,
        message: `Failed to fetch discovery document: HTTP ${response.status}`,
        errorCode: "HTTP",
        details: response.statusText,
      };
    }

    let metadata: any;
    try {
      metadata = await response.json();
    } catch (error: any) {
      return {
        ok: false,
        message: `Invalid JSON in discovery document: ${error.message}`,
        errorCode: "INVALID_METADATA",
      };
    }

    // Validate required fields
    const requiredFields = ["authorization_endpoint", "token_endpoint", "jwks_uri", "issuer"];
    const missingFields = requiredFields.filter((field) => !metadata[field]);

    if (missingFields.length > 0) {
      return {
        ok: false,
        message: `Discovery document missing required fields: ${missingFields.join(", ")}`,
        errorCode: "INVALID_METADATA",
        details: `Found fields: ${Object.keys(metadata).join(", ")}`,
      };
    }

    // Verify issuer matches
    if (metadata.issuer !== normalizedIssuer) {
      return {
        ok: false,
        message: `Issuer mismatch: discovery document issuer "${metadata.issuer}" does not match provided issuer "${normalizedIssuer}"`,
        errorCode: "INVALID_METADATA",
      };
    }

    return {
      ok: true,
      message: "Provider discovery OK",
      details: {
        issuer: metadata.issuer,
        authorization_endpoint: metadata.authorization_endpoint,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      message: `Unexpected error: ${error.message || "Unknown error"}`,
      errorCode: "HTTP",
    };
  }
}

async function testGoogleDiscovery(clientId: string): Promise<TestResponse> {
  if (!clientId || clientId.trim() === "") {
    return {
      ok: false,
      message: "Client ID is required",
      errorCode: "MISSING_FIELD",
    };
  }

  // Google's well-known endpoint
  const discoveryUrl = "https://accounts.google.com/.well-known/openid-configuration";

  try {
    const response = await fetchWithTimeout(discoveryUrl, 10000);
    if (!response.ok) {
      return {
        ok: false,
        message: `Failed to reach Google discovery endpoint: HTTP ${response.status}`,
        errorCode: "HTTP",
      };
    }

    const metadata = await response.json();
    if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
      return {
        ok: false,
        message: "Invalid Google discovery document",
        errorCode: "INVALID_METADATA",
      };
    }

    return {
      ok: true,
      message: "Google provider discovery OK",
      details: {
        issuer: metadata.issuer,
        authorization_endpoint: metadata.authorization_endpoint,
      },
    };
  } catch (error: any) {
    if (error.message === "Request timeout") {
      return {
        ok: false,
        message: "Connection timeout while fetching Google discovery document",
        errorCode: "TIMEOUT",
      };
    }
    return {
      ok: false,
      message: `Failed to reach Google discovery endpoint: ${error.message || "Network error"}`,
      errorCode: "HTTP",
    };
  }
}

export async function testAuthConfiguration(payload: TestPayload): Promise<TestResponse> {
  const { provider, issuer, tenantId, clientId } = payload;

  if (!provider || !["google", "azureAd", "oidc"].includes(provider)) {
    return {
      ok: false,
      message: "Invalid provider. Must be 'google', 'azureAd', or 'oidc'",
      errorCode: "MISSING_FIELD",
    };
  }

  // Test Google
  if (provider === "google") {
    if (!clientId) {
      return {
        ok: false,
        message: "Client ID is required for Google provider",
        errorCode: "MISSING_FIELD",
      };
    }
    return testGoogleDiscovery(clientId);
  }

  // Test Azure AD or OIDC
  if (provider === "azureAd" || provider === "oidc") {
    // Resolve issuer
    let resolvedIssuer: string;

    if (provider === "azureAd") {
      if (!tenantId && !issuer) {
        return {
          ok: false,
          message: "Azure AD requires either tenantId or issuer",
          errorCode: "MISSING_FIELD",
        };
      }
      // Build issuer from tenantId if not provided
      resolvedIssuer = issuer || `https://login.microsoftonline.com/${tenantId}/v2.0`;
    } else {
      // OIDC generic
      if (!issuer) {
        return {
          ok: false,
          message: "Issuer is required for OIDC provider",
          errorCode: "MISSING_FIELD",
        };
      }
      resolvedIssuer = issuer;
    }

    if (!clientId) {
      return {
        ok: false,
        message: "Client ID is required",
        errorCode: "MISSING_FIELD",
      };
    }

    return testOIDCDiscovery(resolvedIssuer);
  }

  return {
    ok: false,
    message: "Unknown provider",
    errorCode: "MISSING_FIELD",
  };
}
