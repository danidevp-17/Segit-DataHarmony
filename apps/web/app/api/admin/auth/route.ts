import { NextRequest, NextResponse } from "next/server";
import { loadAuthConfig, saveAuthConfig, type ActiveProvider } from "@/lib/admin/auth";
import { saveSecret, deleteSecret, getSecret } from "@/lib/admin/secrets";

export async function GET() {
  try {
    const config = await loadAuthConfig();
    
    // Handle legacy format migration
    let activeProvider: ActiveProvider = config.activeProvider || "none";
    if (!config.activeProvider) {
      // Migrate from old format
      if ((config as any).providers?.google?.enabled) {
        activeProvider = "google";
      } else if ((config as any).providers?.azureAd?.enabled) {
        activeProvider = "azureAd";
      } else if ((config as any).providers?.oidcGeneric?.enabled) {
        activeProvider = "oidc";
      }
    }

    // Return sanitized config (never return secret refs)
    const sanitized = {
      activeProvider,
      baseUrl: config.baseUrl,
      providers: {
        google: {
          clientId: config.providers.google.clientId,
          callbackUrl: config.providers.google.callbackUrl,
        },
        azureAd: {
          clientId: config.providers.azureAd.clientId,
          tenantId: config.providers.azureAd.tenantId,
          issuer: config.providers.azureAd.issuer,
          callbackUrl: config.providers.azureAd.callbackUrl,
        },
        oidc: {
          clientId: (config.providers as any).oidc?.clientId || (config.providers as any).oidcGeneric?.clientId,
          issuer: (config.providers as any).oidc?.issuer || (config.providers as any).oidcGeneric?.issuer,
          callbackUrl: (config.providers as any).oidc?.callbackUrl || (config.providers as any).oidcGeneric?.callbackUrl,
        },
      },
    };
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Failed to load auth config:", error);
    return NextResponse.json(
      { error: "Failed to load auth config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await loadAuthConfig();
    const { testAuthConfiguration } = await import("@/lib/admin/auth-test");
    const { getSecret } = await import("@/lib/admin/secrets");

    // Handle legacy format migration
    let activeProvider: ActiveProvider = body.activeProvider || "none";
    if (!body.activeProvider) {
      // Migrate from old format
      if (body.providers?.google?.enabled) {
        activeProvider = "google";
      } else if (body.providers?.azureAd?.enabled) {
        activeProvider = "azureAd";
      } else if (body.providers?.oidcGeneric?.enabled) {
        activeProvider = "oidc";
      }
    }

    // Validate connection if provider is not "none"
    if (activeProvider !== "none") {
      const providerConfig = body.providers?.[activeProvider] || {};
      let clientSecret = providerConfig.clientSecret;

      // If clientSecret not provided, try to get existing one
      if (!clientSecret && activeProvider === "google") {
        clientSecret = await getSecret("auth_google_client_secret");
      } else if (!clientSecret && activeProvider === "azureAd") {
        clientSecret = await getSecret("auth_azuread_client_secret");
      } else if (!clientSecret && activeProvider === "oidc") {
        clientSecret = await getSecret("auth_oidc_client_secret");
      }

      const testPayload: any = {
        provider: activeProvider,
        clientId: providerConfig.clientId,
        baseUrl: body.baseUrl,
      };

      if (activeProvider === "azureAd") {
        if (providerConfig.tenantId) {
          testPayload.tenantId = providerConfig.tenantId;
        }
        if (providerConfig.issuer) {
          testPayload.issuer = providerConfig.issuer;
        }
      } else if (activeProvider === "oidc") {
        testPayload.issuer = providerConfig.issuer;
      }

      // Include clientSecret for testing if available
      if (clientSecret) {
        testPayload.clientSecret = clientSecret;
      }

      const testResult = await testAuthConfiguration(testPayload);
      if (!testResult.ok) {
        return NextResponse.json(
          {
            error: `Configuration validation failed: ${testResult.message}`,
            testError: testResult.message,
          },
          { status: 422 }
        );
      }
    }

    // Update config
    config.activeProvider = activeProvider;
    config.baseUrl = body.baseUrl || config.baseUrl;

    // Update provider configs
    if (body.providers) {
      // Handle Google
      if (body.providers.google) {
        config.providers.google = {
          ...config.providers.google,
          clientId: body.providers.google.clientId,
          callbackUrl: body.providers.google.callbackUrl,
        };
        // Save client secret if provided
        if (body.providers.google.clientSecret) {
          const secretRef = "auth_google_client_secret";
          await saveSecret(secretRef, body.providers.google.clientSecret);
          config.providers.google.clientSecretRef = secretRef;
        }
      }

      // Handle Azure AD
      if (body.providers.azureAd) {
        config.providers.azureAd = {
          ...config.providers.azureAd,
          clientId: body.providers.azureAd.clientId,
          tenantId: body.providers.azureAd.tenantId,
          issuer: body.providers.azureAd.issuer,
          callbackUrl: body.providers.azureAd.callbackUrl,
        };
        if (body.providers.azureAd.clientSecret) {
          const secretRef = "auth_azuread_client_secret";
          await saveSecret(secretRef, body.providers.azureAd.clientSecret);
          config.providers.azureAd.clientSecretRef = secretRef;
        }
      }

      // Handle OIDC (renamed from oidcGeneric)
      if (body.providers.oidc || body.providers.oidcGeneric) {
        const oidcConfig = body.providers.oidc || body.providers.oidcGeneric;
        config.providers.oidc = {
          ...config.providers.oidc,
          clientId: oidcConfig.clientId,
          issuer: oidcConfig.issuer,
          callbackUrl: oidcConfig.callbackUrl,
        };
        if (oidcConfig.clientSecret) {
          const secretRef = "auth_oidc_client_secret";
          await saveSecret(secretRef, oidcConfig.clientSecret);
          config.providers.oidc.clientSecretRef = secretRef;
        }
      }
    }

    await saveAuthConfig(config);

    // Return sanitized config (never return secret refs)
    const sanitized = {
      activeProvider: config.activeProvider,
      baseUrl: config.baseUrl,
      providers: {
        google: {
          clientId: config.providers.google.clientId,
          callbackUrl: config.providers.google.callbackUrl,
        },
        azureAd: {
          clientId: config.providers.azureAd.clientId,
          tenantId: config.providers.azureAd.tenantId,
          issuer: config.providers.azureAd.issuer,
          callbackUrl: config.providers.azureAd.callbackUrl,
        },
        oidc: {
          clientId: config.providers.oidc.clientId,
          issuer: config.providers.oidc.issuer,
          callbackUrl: config.providers.oidc.callbackUrl,
        },
      },
    };

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Failed to save auth config:", error);
    return NextResponse.json(
      { error: "Failed to save auth config" },
      { status: 500 }
    );
  }
}
