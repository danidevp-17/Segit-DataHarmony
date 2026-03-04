"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Play,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import type { DatasourceType } from "@/lib/admin/datasources";

const DEFAULT_PORTS: Record<DatasourceType, number> = {
  postgres: 5432,
  sqlserver: 1433,
  oracle: 1521,
};

interface Datasource {
  id: string;
  name: string;
  type: DatasourceType;
  host: string;
  port: number;
  database?: string;
  serviceName?: string;
  username: string;
  options?: Record<string, any>;
}

export default function DatasourcesPage() {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [formData, setFormData] = useState({
    name: "",
    type: "postgres" as DatasourceType,
    host: "",
    port: 5432,
    database: "",
    serviceName: "",
    sqlServerEncrypt: true,
    username: "",
    password: "",
  });

  const [testStatus, setTestStatus] = useState<{
    state: "not_tested" | "testing" | "ok" | "failed";
    message: string;
    details?: string;
  }>({ state: "not_tested", message: "" });

  useEffect(() => {
    loadDatasources();
  }, []);

  const loadDatasources = async () => {
    try {
      const res = await fetch("/api/admin/datasources");
      if (res.ok) {
        const data = await res.json();
        setDatasources(data);
      }
    } catch (error) {
      console.error("Failed to load datasources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      name: "",
      type: "postgres",
      host: "",
      port: 5432,
      database: "",
      serviceName: "",
      sqlServerEncrypt: true,
      username: "",
      password: "",
    });
    setTestStatus({ state: "not_tested", message: "" });
    setShowModal(true);
  };

  const handleEdit = (ds: Datasource) => {
    setEditingId(ds.id);
    setFormData({
      name: ds.name,
      type: ds.type,
      host: ds.host,
      port: ds.port,
      database: ds.database || "",
      serviceName: ds.serviceName || "",
      sqlServerEncrypt: ds.options?.encrypt !== false,
      username: ds.username,
      password: "", // Don't populate password
    });
    setTestStatus({ state: "not_tested", message: "" });
    setShowModal(true);
  };

  // Reset test status when relevant fields change
  const handleFormChange = (updates: Partial<typeof formData>) => {
    // When type changes, set port to default for that DB
    if ("type" in updates && updates.type) {
      updates = { ...updates, port: DEFAULT_PORTS[updates.type] };
    }
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    
    // Reset test status if connection-related fields changed
    if (testStatus.state === "ok" || testStatus.state === "failed") {
      const relevantFields = ["type", "host", "port", "database", "serviceName", "sqlServerEncrypt", "username", "password"];
      const changedRelevantField = Object.keys(updates).some(key => relevantFields.includes(key));
      if (changedRelevantField) {
        setTestStatus({ state: "not_tested", message: "" });
      }
    }
  };

  const handleTestConnection = async () => {
    // Validate required fields
    if (!formData.host || !formData.port || !formData.username || !formData.password) {
      setTestStatus({
        state: "failed",
        message: "Please fill in all required fields (host, port, username, password)",
      });
      return;
    }

    if (formData.type === "oracle" && !formData.serviceName) {
      setTestStatus({
        state: "failed",
        message: "Oracle datasource requires serviceName",
      });
      return;
    }

    if (formData.type !== "oracle" && !formData.database) {
      setTestStatus({
        state: "failed",
        message: `${formData.type} datasource requires database`,
      });
      return;
    }

    setTestStatus({ state: "testing", message: "Testing connection..." });

    try {
      const res = await fetch("/api/admin/datasources/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          serviceName: formData.serviceName,
          username: formData.username,
          password: formData.password,
          options:
            formData.type === "sqlserver"
              ? { encrypt: formData.sqlServerEncrypt }
              : {},
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setTestStatus({
          state: "ok",
          message: data.message || "Connection OK",
        });
      } else {
        setTestStatus({
          state: "failed",
          message: data.message || "Connection test failed",
          details: data.details,
        });
      }
    } catch (error) {
      setTestStatus({
        state: "failed",
        message: "Failed to test connection: Network error or server unavailable",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this datasource?")) return;

    try {
      const res = await fetch(`/api/admin/datasources/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setStatus({
          type: "success",
          message: "Datasource deleted successfully",
        });
        loadDatasources();
      } else {
        const data = await res.json();
        setStatus({
          type: "error",
          message: data.error || "Failed to delete datasource",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to delete datasource",
      });
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setStatus({ type: null, message: "" }); // Clear previous status
    
    try {
      const res = await fetch(`/api/admin/datasources/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.ok) {
        setStatus({
          type: "success",
          message: data.message || "Connection OK",
        });
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setStatus({ type: null, message: "" });
        }, 5000);
      } else {
        setStatus({
          type: "error",
          message: data.message || "Connection test failed",
        });
        // Show details if available
        if (data.details) {
          console.error("Connection test details:", data.details);
        }
        // Auto-dismiss error message after 10 seconds
        setTimeout(() => {
          setStatus({ type: null, message: "" });
        }, 10000);
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to test connection: Network error or server unavailable",
      });
      // Auto-dismiss error message after 10 seconds
      setTimeout(() => {
        setStatus({ type: null, message: "" });
      }, 10000);
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For new datasources, require successful test
    if (!editingId && testStatus.state !== "ok") {
      setTestStatus({
        state: "failed",
        message: "Please test the connection successfully before creating",
      });
      return;
    }

    const url = editingId
      ? `/api/admin/datasources/${editingId}`
      : "/api/admin/datasources";
    const method = editingId ? "PUT" : "POST";

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        type: formData.type,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        serviceName: formData.serviceName,
        username: formData.username,
        password: formData.password,
      };
      if (formData.type === "sqlserver") {
        payload.options = { encrypt: formData.sqlServerEncrypt };
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus({
          type: "success",
          message: editingId
            ? "Datasource updated successfully"
            : "Datasource created successfully",
        });
        setShowModal(false);
        setTestStatus({ state: "not_tested", message: "" });
        loadDatasources();
      } else {
        const data = await res.json();
        // If it's a validation error from backend, update test status
        if (res.status === 422 && data.testError) {
          setTestStatus({
            state: "failed",
            message: data.testError,
            details: data.details,
          });
        }
        setStatus({
          type: "error",
          message: data.error || "Failed to save datasource",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to save datasource",
      });
    }
  };

  // Check if form is valid and test passed
  const isFormValid = () => {
    if (!formData.name || !formData.host || !formData.port || !formData.username) {
      return false;
    }
    if (formData.type === "oracle" && !formData.serviceName) {
      return false;
    }
    if (formData.type !== "oracle" && !formData.database) {
      return false;
    }
    if (!editingId && !formData.password) {
      return false;
    }
    return true;
  };

  const canCreate = isFormValid() && (editingId || testStatus.state === "ok");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading datasources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Datasources</h1>
            <p className="mt-1 text-sm text-slate-500">
              Register and manage database connections
            </p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition"
        >
          <Plus className="h-4 w-4" />
          New Datasource
        </button>
      </div>

      {status.type && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">{status.message}</p>
          </div>
          <button
            onClick={() => setStatus({ type: null, message: "" })}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition"
            aria-label="Dismiss"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      {datasources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <Database className="h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-sm font-semibold text-slate-700">
            No datasources
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first datasource to get started
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Host
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Database/Service
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Username
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datasources.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium text-slate-800">
                    {ds.name}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {ds.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {ds.host}:{ds.port}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {ds.database || ds.serviceName || "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{ds.username}</td>
                  <td className="px-5 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTest(ds.id)}
                        disabled={testingId === ds.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition disabled:opacity-50"
                        title="Test connection"
                      >
                        {testingId === ds.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(ds)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ds.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-lg m-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? "Edit Datasource" : "New Datasource"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    handleFormChange({ name: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    handleFormChange({
                      type: e.target.value as DatasourceType,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="sqlserver">SQL Server / Azure SQL</option>
                  <option value="oracle">Oracle 19+</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) =>
                      handleFormChange({ host: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Port *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) =>
                      handleFormChange({
                        port: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {formData.type === "oracle" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.serviceName}
                    onChange={(e) =>
                      handleFormChange({ serviceName: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Database *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.database}
                    onChange={(e) =>
                      handleFormChange({ database: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              )}

              {formData.type === "sqlserver" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sqlServerEncrypt"
                    checked={formData.sqlServerEncrypt}
                    onChange={(e) =>
                      handleFormChange({ sqlServerEncrypt: e.target.checked })
                    }
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label
                    htmlFor="sqlServerEncrypt"
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    Usar cifrado TLS (requerido por Azure SQL y la mayoría de servidores)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    handleFormChange({ username: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password {editingId ? "(leave empty to keep existing)" : "*"}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) =>
                    handleFormChange({ password: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Test Connection Status */}
              {!editingId && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      Connection Test Status
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
                      Click "Test Connection" to validate the datasource before creating.
                    </p>
                  )}
                  {testStatus.state === "testing" && (
                    <p className="text-xs text-slate-600">Testing connection...</p>
                  )}
                  {testStatus.state === "ok" && (
                    <p className="text-xs text-emerald-700 font-medium">
                      {testStatus.message}
                    </p>
                  )}
                  {testStatus.state === "failed" && (
                    <div>
                      <p className="text-xs text-red-700 break-words font-medium">
                        {testStatus.message}
                      </p>
                      {testStatus.details && (
                        <p className="text-xs text-red-600 break-words mt-1">
                          {testStatus.details}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setTestStatus({ state: "not_tested", message: "" });
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={handleTestConnection}
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
                        Test Connection
                      </>
                    )}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canCreate}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
