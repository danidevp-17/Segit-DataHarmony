"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import BackButton from "@/components/BackButton";
import type { ActiveProvider } from "@/lib/admin/auth";

interface AuthConfig {
  activeProvider: ActiveProvider;
  baseUrl?: string;
  providers: {
    google: {
      clientId?: string;
      clientSecret?: string;
      callbackUrl?: string;
    };
    azureAd: {
      clientId?: string;
      clientSecret?: string;
      tenantId?: string;
      issuer?: string;
      callbackUrl?: string;
    };
    oidc: {
      clientId?: string;
      clientSecret?: string;
      issuer?: string;
      callbackUrl?: string;
    };
  };
}

interface TestStatus {
  state: "not_tested" | "testing" | "ok" | "failed";
  message: string;
  details?: string;
}

export default function AuthConfigPage() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({
    state: "not_tested",
    message: "",
  });
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/admin/auth");
      if (res.ok) {
        const data = await res.json();
        // Handle legacy format migration
        if (!data.activeProvider) {
          // Migrate from old format
          const activeProvider: ActiveProvider =
            data.providers?.google?.enabled
              ? "google"
              : data.providers?.azureAd?.enabled
              ? "azureAd"
              : data.providers?.oidcGeneric?.enabled
              ? "oidc"
              : "none";
          setConfig({
            activeProvider,
            baseUrl: data.baseUrl,
            providers: {
              google: {
                clientId: data.providers?.google?.clientId,
                callbackUrl: data.providers?.google?.callbackUrl,
              },
              azureAd: {
                clientId: data.providers?.azureAd?.clientId,
                tenantId: data.providers?.azureAd?.tenantId,
                issuer: data.providers?.azureAd?.issuer,
                callbackUrl: data.providers?.azureAd?.callbackUrl,
              },
              oidc: {
                clientId: data.providers?.oidcGeneric?.clientId,
                issuer: data.providers?.oidcGeneric?.issuer,
                callbackUrl: data.providers?.oidcGeneric?.callbackUrl,
              },
            },
          });
        } else {
          setConfig(data);
        }
      }
    } catch (error) {
      console.error("Failed to load auth config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: ActiveProvider) => {
    if (!config) return;
    setConfig({ ...config, activeProvider: provider });
    // Reset test status when provider changes
    setTestStatus({ state: "not_tested", message: "" });
  };

  const handleFieldChange = (
    provider: "google" | "azureAd" | "oidc",
    field: string,
    value: string
  ) => {
    if (!config) return;
    const providerConfig = config.providers[provider];
    const updated = { ...providerConfig, [field]: value };
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [provider]: updated,
      },
    });

    // Reset test status if relevant field changed
    if (testStatus.state === "ok" || testStatus.state === "failed") {
      const relevantFields = ["clientId", "clientSecret", "issuer", "tenantId", "baseUrl"];
      if (relevantFields.includes(field)) {
        setTestStatus({ state: "not_tested", message: "" });
      }
    }
  };

  const handleTest = async () => {
    if (!config || config.activeProvider === "none") {
      return;
    }

    const provider = config.activeProvider;
    const providerConfig = config.providers[provider];

    // Validate required fields
    if (!providerConfig.clientId) {
      setTestStatus({
        state: "failed",
        message: "Client ID is required",
      });
      return;
    }

    const pc = providerConfig as Record<string, unknown>;
    if (provider === "azureAd" && !pc.tenantId && !pc.issuer) {
      setTestStatus({
        state: "failed",
        message: "Azure AD requires either Tenant ID or Issuer",
      });
      return;
    }

    if (provider === "oidc" && !pc.issuer) {
      setTestStatus({
        state: "failed",
        message: "Issuer is required for OIDC provider",
      });
      return;
    }

    setTestStatus({ state: "testing", message: "Testing provider configuration..." });

    try {
      const testPayload: any = {
        provider,
        clientId: providerConfig.clientId,
        baseUrl: config.baseUrl,
      };

      if (provider === "azureAd") {
        if (pc.tenantId) {
          testPayload.tenantId = pc.tenantId;
        }
        if (pc.issuer) {
          testPayload.issuer = pc.issuer;
        }
      } else if (provider === "oidc") {
        testPayload.issuer = pc.issuer;
      }

      // Include clientSecret if provided (for testing)
      if (providerConfig.clientSecret) {
        testPayload.clientSecret = providerConfig.clientSecret;
      }

      const res = await fetch("/api/admin/auth/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      const data = await res.json();

      if (data.ok) {
        setTestStatus({
          state: "ok",
          message: data.message || "Provider configuration OK",
          details: typeof data.details === "object" ? JSON.stringify(data.details, null, 2) : data.details,
        });
      } else {
        setTestStatus({
          state: "failed",
          message: data.message || "Test failed",
          details: data.details,
        });
      }
    } catch (error) {
      setTestStatus({
        state: "failed",
        message: "Failed to test configuration: Network error or server unavailable",
      });
    }
  };

  const handleSave = async () => {
    if (!config) return;

    // For non-none providers, require successful test
    if (config.activeProvider !== "none" && testStatus.state !== "ok") {
      setTestStatus({
        state: "failed",
        message: "Please test the configuration successfully before saving",
      });
      return;
    }

    setSaving(true);
    setStatus({ type: null, message: "" });

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setStatus({
          type: "success",
          message: "Authentication configuration saved successfully",
        });
      } else {
        const data = await res.json();
        // If it's a validation error, update test status
        if (res.status === 422 && data.testError) {
          setTestStatus({
            state: "failed",
            message: data.testError,
          });
        }
        setStatus({
          type: "error",
          message: data.error || "Failed to save configuration",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to save configuration",
      });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = (): boolean => {
    if (!config) return false;
    if (config.activeProvider === "none") return true;

    const provider = config.activeProvider;
    const providerConfig = config.providers[provider];
    const pc = providerConfig as Record<string, unknown>;

    if (!providerConfig.clientId) return false;

    if (provider === "azureAd") {
      return !!(pc.tenantId || pc.issuer);
    }

    if (provider === "oidc") {
      return !!pc.issuer;
    }

    return true;
  };

  const canSave = isFormValid() && (config?.activeProvider === "none" || testStatus.state === "ok");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="mt-3 text-sm text-slate-600">Failed to load configuration</p>
      </div>
    );
  }

  const activeProvider = config.activeProvider;
  const activeProviderConfig = activeProvider === "none" ? undefined : config.providers[activeProvider];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Directory / Identity Provider Configuration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure OIDC identity providers for enterprise authentication. For on-prem AD, use an IdP (Azure AD/ADFS/Keycloak) synced to AD. The portal integrates with the IdP via OIDC.
          </p>
        </div>
      </div>

      {status.type && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Base URL */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Base Configuration</h2>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Base URL
            </label>
            <input
              type="text"
              value={config.baseUrl || ""}
              onChange={(e) => {
                setConfig({ ...config, baseUrl: e.target.value });
                if (testStatus.state === "ok" || testStatus.state === "failed") {
                  setTestStatus({ state: "not_tested", message: "" });
                }
              }}
              placeholder="https://your-domain.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Active Provider Selection */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Active Identity Provider</h2>
            <p className="text-xs text-slate-500 mt-1">
              Only one provider can be active at a time
            </p>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="activeProvider"
                  value="none"
                  checked={activeProvider === "none"}
                  onChange={() => handleProviderChange("none")}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700">None (disabled)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="activeProvider"
                  value="google"
                  checked={activeProvider === "google"}
                  onChange={() => handleProviderChange("google")}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700">Google</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="activeProvider"
                  value="azureAd"
                  checked={activeProvider === "azureAd"}
                  onChange={() => handleProviderChange("azureAd")}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700">Azure AD</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="activeProvider"
                  value="oidc"
                  checked={activeProvider === "oidc"}
                  onChange={() => handleProviderChange("oidc")}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700">OIDC Generic</span>
              </label>
            </div>
          </div>
        </div>

        {/* Provider Configuration */}
        {activeProvider !== "none" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">
                {activeProvider === "google"
                  ? "Google Configuration"
                  : activeProvider === "azureAd"
                  ? "Azure AD Configuration"
                  : "OIDC Configuration"}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Google */}
              {activeProvider === "google" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeProviderConfig?.clientId || ""}
                      onChange={(e) =>
                        handleFieldChange("google", "clientId", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={activeProviderConfig?.clientSecret || ""}
                      onChange={(e) =>
                        handleFieldChange("google", "clientSecret", e.target.value)
                      }
                      placeholder="Leave empty to keep existing"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Callback URL
                    </label>
                    <input
                      type="text"
                      value={activeProviderConfig?.callbackUrl || ""}
                      onChange={(e) =>
                        handleFieldChange("google", "callbackUrl", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </>
              )}

              {/* Azure AD */}
              {activeProvider === "azureAd" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeProviderConfig?.clientId || ""}
                      onChange={(e) =>
                        handleFieldChange("azureAd", "clientId", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tenant ID
                    </label>
                    <input
                      type="text"
                      value={String((activeProviderConfig as Record<string, unknown> | undefined)?.tenantId ?? "")}
                      onChange={(e) =>
                        handleFieldChange("azureAd", "tenantId", e.target.value)
                      }
                      placeholder="Required if Issuer not provided"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Either Tenant ID or Issuer must be provided
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Issuer URL
                    </label>
                    <input
                      type="text"
                      value={String((activeProviderConfig as Record<string, unknown> | undefined)?.issuer ?? "")}
                      onChange={(e) =>
                        handleFieldChange("azureAd", "issuer", e.target.value)
                      }
                      placeholder="https://login.microsoftonline.com/{tenantId}/v2.0"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Optional: Will be built from Tenant ID if not provided
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={activeProviderConfig?.clientSecret || ""}
                      onChange={(e) =>
                        handleFieldChange("azureAd", "clientSecret", e.target.value)
                      }
                      placeholder="Leave empty to keep existing"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Callback URL
                    </label>
                    <input
                      type="text"
                      value={activeProviderConfig?.callbackUrl || ""}
                      onChange={(e) =>
                        handleFieldChange("azureAd", "callbackUrl", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </>
              )}

              {/* OIDC Generic */}
              {activeProvider === "oidc" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Issuer URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={String((activeProviderConfig as Record<string, unknown> | undefined)?.issuer ?? "")}
                      onChange={(e) =>
                        handleFieldChange("oidc", "issuer", e.target.value)
                      }
                      placeholder="https://your-oidc-provider.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeProviderConfig?.clientId || ""}
                      onChange={(e) =>
                        handleFieldChange("oidc", "clientId", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={activeProviderConfig?.clientSecret || ""}
                      onChange={(e) =>
                        handleFieldChange("oidc", "clientSecret", e.target.value)
                      }
                      placeholder="Leave empty to keep existing"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Callback URL
                    </label>
                    <input
                      type="text"
                      value={activeProviderConfig?.callbackUrl || ""}
                      onChange={(e) =>
                        handleFieldChange("oidc", "callbackUrl", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </>
              )}

              {/* Test Status */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Configuration Test Status
                  </label>
                  {testStatus.state === "testing" && (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                  )}
                  {testStatus.state === "ok" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  {testStatus.state === "failed" && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                {testStatus.state === "not_tested" && (
                  <p className="text-xs text-slate-500">
                    Click "Test Configuration" to validate the provider before saving.
                  </p>
                )}
                {testStatus.state === "testing" && (
                  <p className="text-xs text-slate-600">Testing configuration...</p>
                )}
                {testStatus.state === "ok" && (
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">
                      {testStatus.message}
                    </p>
                    {testStatus.details && (
                      <pre className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-auto">
                        {testStatus.details}
                      </pre>
                    )}
                  </div>
                )}
                {testStatus.state === "failed" && (
                  <div>
                    <p className="text-xs text-red-700 break-words font-medium">
                      {testStatus.message}
                    </p>
                    {testStatus.details && (
                      <p className="mt-1 text-xs text-red-600 break-words">
                        {testStatus.details}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {activeProvider !== "none" && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testStatus.state === "testing" || !isFormValid()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus.state === "testing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Test Configuration
              </>
            )}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {activeProvider !== "none" ? "Save / Activate" : "Save Configuration"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
