import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { getRoutineById, Routine } from "./catalog";

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Maximum number of jobs that can run concurrently.
 * Helps prevent resource exhaustion attacks.
 */
const MAX_RUNNING_JOBS = 2;

/**
 * Maximum length for parameter values.
 * Prevents excessively long inputs that could cause issues.
 */
const MAX_PARAM_LENGTH = 200;

/**
 * Maximum filename length after sanitization.
 */
const MAX_FILENAME_LENGTH = 120;

/**
 * Allowed characters in parameter values.
 * Only alphanumeric, underscore, hyphen, period, and space.
 * This prevents shell metacharacters from being injected.
 */
const ALLOWED_PARAM_CHARS = /^[A-Za-z0-9_\-. ]*$/;

/**
 * Allowed characters in filenames after sanitization.
 */
const ALLOWED_FILENAME_CHARS = /^[A-Za-z0-9._-]+$/;

// =============================================================================
// IN-MEMORY CONCURRENCY LIMITER
// =============================================================================

/**
 * Simple in-memory tracker for running jobs.
 * Note: This resets on server restart. For production, use Redis or a database.
 */
const runningJobs = new Set<string>();

/**
 * Check if we can start a new job (concurrency limit not exceeded).
 */
export function canStartJob(): boolean {
  return runningJobs.size < MAX_RUNNING_JOBS;
}

/**
 * Get current number of running jobs.
 */
export function getRunningJobCount(): number {
  return runningJobs.size;
}

/**
 * Mark a job as running (for concurrency tracking).
 */
function markJobRunning(jobId: string): void {
  runningJobs.add(jobId);
}

/**
 * Mark a job as finished (for concurrency tracking).
 */
function markJobFinished(jobId: string): void {
  runningJobs.delete(jobId);
}

// =============================================================================
// TYPES
// =============================================================================

export interface Job {
  id: string;
  routineId: string;
  params: Record<string, string>;
  files: string[];
  status: "queued" | "running" | "succeeded" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

interface Settings {
  OW_HOME: string;
  WORKSPACE_ROOT: string;
  OW_ENV_SCRIPT?: string;
}

// =============================================================================
// PATHS
// =============================================================================

const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_DIR = path.join(DATA_DIR, "jobs");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

// =============================================================================
// SECURITY HELPERS
// =============================================================================

/**
 * Sanitize a filename to prevent path traversal and injection attacks.
 *
 * Security measures:
 * - Rejects filenames containing '..' (path traversal)
 * - Rejects filenames containing '/' or '\' (path separators)
 * - Extracts only the basename (removes any directory components)
 * - Replaces unsafe characters with '_'
 * - Caps length to MAX_FILENAME_LENGTH
 *
 * @param name - The original filename from user input
 * @returns Object with sanitized filename or error message
 */
export function safeFilename(name: string): { safe?: string; error?: string } {
  // SECURITY: Reject path traversal attempts
  if (name.includes("..")) {
    return { error: "Filename cannot contain '..'" };
  }

  // SECURITY: Reject path separators (both Unix and Windows)
  if (name.includes("/") || name.includes("\\")) {
    return { error: "Filename cannot contain path separators" };
  }

  // Extract basename (extra safety layer)
  let sanitized = path.basename(name);

  // SECURITY: Replace any character not in allowed set with '_'
  sanitized = sanitized.replace(/[^A-Za-z0-9._-]/g, "_");

  // SECURITY: Cap length to prevent filesystem issues
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    // Preserve extension if possible
    const ext = path.extname(sanitized);
    const base = path.basename(sanitized, ext);
    const maxBase = MAX_FILENAME_LENGTH - ext.length;
    sanitized = base.slice(0, maxBase) + ext;
  }

  // Reject empty filenames
  if (!sanitized || sanitized === "." || sanitized === "..") {
    return { error: "Invalid filename" };
  }

  // Final validation
  if (!ALLOWED_FILENAME_CHARS.test(sanitized)) {
    return { error: "Filename contains invalid characters" };
  }

  return { safe: sanitized };
}

/**
 * Validate a parameter value for safety.
 *
 * Security measures:
 * - Checks value is a string
 * - Enforces maximum length
 * - Only allows safe characters (no shell metacharacters)
 *
 * @param key - Parameter key (for error messages)
 * @param value - Parameter value from user input
 * @returns Object with validated value or error message
 */
export function validateParamValue(
  key: string,
  value: unknown
): { valid?: string; error?: string } {
  // Must be a string
  if (typeof value !== "string") {
    return { error: `Parameter '${key}' must be a string` };
  }

  // SECURITY: Enforce maximum length
  if (value.length > MAX_PARAM_LENGTH) {
    return {
      error: `Parameter '${key}' exceeds maximum length of ${MAX_PARAM_LENGTH}`,
    };
  }

  // SECURITY: Only allow safe characters (prevents shell injection)
  if (!ALLOWED_PARAM_CHARS.test(value)) {
    return {
      error: `Parameter '${key}' contains invalid characters. Only letters, numbers, underscore, hyphen, period, and space are allowed.`,
    };
  }

  return { valid: value };
}

/**
 * Validate that only known parameter keys are provided.
 *
 * Security measure: Prevents injection of unexpected parameters
 * that could be used maliciously.
 *
 * @param params - User-provided parameters
 * @param routine - The routine definition from catalog
 * @returns Object with validated params or error message
 */
function validateParams(
  params: Record<string, string>,
  routine: Routine
): { validated?: Record<string, string>; error?: string } {
  // Get the set of allowed parameter keys from the routine catalog
  const allowedKeys = new Set(routine.params.map((p) => p.key));
  const validated: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    // SECURITY: Reject unknown parameter keys
    if (!allowedKeys.has(key)) {
      return { error: `Unknown parameter '${key}' for routine '${routine.id}'` };
    }

    // SECURITY: Validate parameter value
    const result = validateParamValue(key, value);
    if (result.error) {
      return { error: result.error };
    }

    validated[key] = result.valid!;
  }

  return { validated };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function getJobDir(jobId: string): string {
  return path.join(JOBS_DIR, jobId);
}

async function loadSettings(): Promise<Settings | null> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getJob(jobId: string): Promise<Job | null> {
  try {
    const jobPath = path.join(getJobDir(jobId), "job.json");
    const raw = await fs.readFile(jobPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveJob(job: Job): Promise<void> {
  const jobDir = getJobDir(job.id);
  await ensureDir(jobDir);
  await fs.writeFile(
    path.join(jobDir, "job.json"),
    JSON.stringify(job, null, 2),
    "utf-8"
  );
}

export async function updateJobStatus(
  jobId: string,
  updates: Partial<Job>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;
  Object.assign(job, updates);
  await saveJob(job);
}

export async function listJobs(): Promise<Job[]> {
  try {
    await ensureDir(JOBS_DIR);
    const entries = await fs.readdir(JOBS_DIR, { withFileTypes: true });
    const jobs: Job[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const job = await getJob(entry.name);
        if (job) jobs.push(job);
      }
    }

    jobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return jobs;
  } catch {
    return [];
  }
}

// =============================================================================
// JOB CREATION
// =============================================================================

/**
 * Create a new job with full security validation.
 *
 * Security measures:
 * 1. WHITELIST: Only accepts routineId from catalog.json
 * 2. SCRIPT PATH: Uses script path from catalog, never from client
 * 3. PARAM VALIDATION: Validates params against catalog and sanitizes values
 * 4. FILENAME SANITIZATION: All uploaded files go through safeFilename()
 * 5. CONCURRENCY: Checks against MAX_RUNNING_JOBS limit
 * 6. DIRECTORY ISOLATION: Files saved only to uploads/ subdirectory
 */
export async function createJob(
  routineId: string,
  params: Record<string, string>,
  uploadedFiles: { name: string; data: Buffer }[]
): Promise<{ job?: Job; error?: string; statusCode?: number }> {
  // -------------------------------------------------------------------------
  // SECURITY CHECK 1: Concurrency limit
  // Prevents resource exhaustion by limiting concurrent jobs
  // -------------------------------------------------------------------------
  if (!canStartJob()) {
    return {
      error: `Server busy: ${MAX_RUNNING_JOBS} jobs already running. Please try again later.`,
      statusCode: 429,
    };
  }

  // -------------------------------------------------------------------------
  // SECURITY CHECK 2: Whitelist validation
  // CRITICAL: Only accept routineId that exists in catalog.json
  // The script path comes from the catalog, NEVER from the client
  // -------------------------------------------------------------------------
  const routine = await getRoutineById(routineId);
  if (!routine) {
    return { error: `Routine '${routineId}' not found in catalog` };
  }

  // -------------------------------------------------------------------------
  // SECURITY CHECK 3: Parameter validation
  // - Only allow params defined in the routine catalog
  // - Validate each value against allowed characters
  // - Enforce maximum length
  // -------------------------------------------------------------------------
  const paramValidation = validateParams(params, routine);
  if (paramValidation.error) {
    return { error: paramValidation.error };
  }
  const validatedParams = paramValidation.validated!;

  // Validate required params
  for (const p of routine.params) {
    if (p.required && !validatedParams[p.key]?.trim()) {
      return { error: `Missing required parameter: ${p.label}` };
    }
  }

  // -------------------------------------------------------------------------
  // SECURITY CHECK 4: Filename sanitization
  // All uploaded files must pass safeFilename() validation
  // -------------------------------------------------------------------------
  const sanitizedFiles: { name: string; safeName: string; data: Buffer }[] = [];
  for (const file of uploadedFiles) {
    const result = safeFilename(file.name);
    if (result.error) {
      return { error: `Invalid filename '${file.name}': ${result.error}` };
    }
    sanitizedFiles.push({
      name: file.name,
      safeName: result.safe!,
      data: file.data,
    });
  }

  // -------------------------------------------------------------------------
  // Create job structure
  // SECURITY: Files saved ONLY to data/jobs/<jobId>/uploads/
  // -------------------------------------------------------------------------
  const jobId = randomUUID();
  const jobDir = getJobDir(jobId);
  const uploadsDir = path.join(jobDir, "uploads");
  const outputsDir = path.join(jobDir, "outputs");
  const logsDir = path.join(jobDir, "logs");

  await ensureDir(uploadsDir);
  await ensureDir(outputsDir);
  await ensureDir(logsDir);

  // Save uploaded files with sanitized names
  const fileNames: string[] = [];
  for (const file of sanitizedFiles) {
    // SECURITY: Files saved ONLY to uploads/ subdirectory
    const filePath = path.join(uploadsDir, file.safeName);
    await fs.writeFile(filePath, file.data);
    fileNames.push(file.safeName);
  }

  const job: Job = {
    id: jobId,
    routineId,
    params: validatedParams,
    files: fileNames,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  await saveJob(job);

  // Start execution asynchronously
  // SECURITY: Pass the routine object which contains the whitelisted script path
  executeJob(job, routine).catch((err) => {
    console.error(`Job ${jobId} execution error:`, err);
  });

  return { job };
}

// =============================================================================
// JOB EXECUTION
// =============================================================================

/**
 * Execute a job using child_process.spawn (or mock if MOCK_MODE=1).
 *
 * Security measures:
 * 1. Script path comes from routine catalog (whitelist), never from user input
 * 2. Parameters are passed via environment variables (not interpolated into shell)
 * 3. Working directory is isolated to job's uploads/ folder
 * 4. Outputs are written only to designated directories
 */
async function executeJob(job: Job, routine: Routine): Promise<void> {
  const jobDir = getJobDir(job.id);
  const settings = await loadSettings();
  const isMockMode = process.env.MOCK_MODE === "1";

  // Track this job as running for concurrency limit
  markJobRunning(job.id);

  const startedAt = new Date().toISOString();

  // Update status to running
  await updateJobStatus(job.id, {
    status: "running",
    startedAt,
  });

  // -------------------------------------------------------------------------
  // SECURITY: Script path resolution
  // The script path comes ONLY from the catalog entry, never from user input
  // This is the whitelist enforcement
  // -------------------------------------------------------------------------
  const projectRoot = path.join(process.cwd(), "..");
  const scriptPath = path.join(projectRoot, routine.script);

  // Verify script exists (whitelist check) - skip in mock mode
  if (!isMockMode) {
    try {
      await fs.access(scriptPath);
    } catch (err) {
      console.error(`Script not found: ${routine.script}`, err);
      markJobFinished(job.id);
      await updateJobStatus(job.id, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: `Script not found: ${routine.script}`,
      });
      return;
    }
  }

  // -------------------------------------------------------------------------
  // SECURITY: Environment variables
  // Parameters are passed as env vars, not interpolated into shell commands
  // This prevents command injection attacks
  // -------------------------------------------------------------------------
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
  };
  if (settings?.OW_HOME) env.OW_HOME = settings.OW_HOME;
  if (settings?.WORKSPACE_ROOT) env.WORKSPACE_ROOT = settings.WORKSPACE_ROOT;

  // Add validated job params as environment variables
  // SECURITY: These values have already been validated by validateParamValue()
  for (const [key, value] of Object.entries(job.params)) {
    env[key] = value;
  }

  // Add job paths
  env.JOB_DIR = jobDir;
  env.JOB_UPLOADS = path.join(jobDir, "uploads");
  env.JOB_OUTPUTS = path.join(jobDir, "outputs");

  // -------------------------------------------------------------------------
  // Build the command
  // SECURITY: Script path is from catalog (whitelisted), not user input
  // -------------------------------------------------------------------------
  let command = "";
  if (settings?.OW_ENV_SCRIPT) {
    const envScriptPath = settings.OW_ENV_SCRIPT;
    if (isMockMode) {
      command = `source "${envScriptPath}" 2>/dev/null || true; `;
    } else {
      try {
        await fs.access(envScriptPath);
        command = `source "${envScriptPath}" 2>/dev/null || true; `;
      } catch {
        // Env script doesn't exist, continue without it
      }
    }
  }
  command += `bash "${scriptPath}"`;

  const finalCommand = `bash -lc '${command}'`;

  // -------------------------------------------------------------------------
  // MOCK MODE: Skip actual execution
  // -------------------------------------------------------------------------
  if (isMockMode) {
    try {
      const finishedAt = new Date().toISOString();

      const stdoutPath = path.join(jobDir, "logs", "stdout.log");
      const mockStdout = [
        `[MOCK MODE] Job execution simulated`,
        ``,
        `Command that would have been executed:`,
        `  ${finalCommand}`,
        ``,
        `Working directory: ${path.join(jobDir, "uploads")}`,
        ``,
        `Environment variables:`,
        `  OW_HOME=${env.OW_HOME || "(not set)"}`,
        `  WORKSPACE_ROOT=${env.WORKSPACE_ROOT || "(not set)"}`,
        `  JOB_DIR=${env.JOB_DIR}`,
        `  JOB_UPLOADS=${env.JOB_UPLOADS}`,
        `  JOB_OUTPUTS=${env.JOB_OUTPUTS}`,
        ...Object.entries(job.params).map(([k, v]) => `  ${k}=${v}`),
        ``,
        `Timestamp: ${finishedAt}`,
      ].join("\n");
      await fs.writeFile(stdoutPath, mockStdout, "utf-8");

      const stderrPath = path.join(jobDir, "logs", "stderr.log");
      await fs.writeFile(stderrPath, "", "utf-8");

      // SECURITY: Output file written ONLY to outputs/ subdirectory
      const resultPath = path.join(jobDir, "outputs", "result.txt");
      const resultContent = [
        `[MOCK MODE] Job Result`,
        ``,
        `Job ID: ${job.id}`,
        `Routine ID: ${job.routineId}`,
        ``,
        `Parameters:`,
        ...Object.entries(job.params).map(([k, v]) => `  ${k}: ${v}`),
        ...(Object.keys(job.params).length === 0 ? ["  (none)"] : []),
        ``,
        `Uploaded Files:`,
        ...job.files.map((f) => `  - ${f}`),
        ...(job.files.length === 0 ? ["  (none)"] : []),
        ``,
        `Timestamps:`,
        `  Created: ${job.createdAt}`,
        `  Started: ${startedAt}`,
        `  Finished: ${finishedAt}`,
      ].join("\n");
      await fs.writeFile(resultPath, resultContent, "utf-8");

      markJobFinished(job.id);
      await updateJobStatus(job.id, {
        status: "succeeded",
        finishedAt,
      });

      return;
    } catch (err) {
      console.error(
        `[MOCK MODE] Failed to create mock outputs for job ${job.id}:`,
        err
      );
      markJobFinished(job.id);
      await updateJobStatus(job.id, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: `Mock mode error: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }
  }

  // -------------------------------------------------------------------------
  // REAL MODE: Execute using child_process.spawn
  // SECURITY: Working directory isolated to job's uploads/ folder
  // -------------------------------------------------------------------------
  const stdoutPath = path.join(jobDir, "logs", "stdout.log");
  const stderrPath = path.join(jobDir, "logs", "stderr.log");
  const stdoutStream = await fs.open(stdoutPath, "w");
  const stderrStream = await fs.open(stderrPath, "w");

  return new Promise<void>((resolve) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: path.join(jobDir, "uploads"),
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", async (data: Buffer) => {
      await stdoutStream.write(data);
    });

    child.stderr?.on("data", async (data: Buffer) => {
      await stderrStream.write(data);
    });

    child.on("close", async (code) => {
      await stdoutStream.close();
      await stderrStream.close();
      markJobFinished(job.id);

      if (code === 0) {
        await updateJobStatus(job.id, {
          status: "succeeded",
          finishedAt: new Date().toISOString(),
        });
      } else {
        await updateJobStatus(job.id, {
          status: "failed",
          finishedAt: new Date().toISOString(),
          error: `Process exited with code ${code}`,
        });
      }
      resolve();
    });

    child.on("error", async (err) => {
      console.error(`Job ${job.id} spawn error:`, err);
      await stdoutStream.close();
      await stderrStream.close();
      markJobFinished(job.id);
      await updateJobStatus(job.id, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: err.message,
      });
      resolve();
    });
  });
}

// =============================================================================
// LOG AND ARTIFACT ACCESS
// =============================================================================

export async function getJobLogs(
  jobId: string,
  type: "stdout" | "stderr" = "stdout",
  tail?: number
): Promise<string> {
  const logPath = path.join(getJobDir(jobId), "logs", `${type}.log`);
  try {
    const content = await fs.readFile(logPath, "utf-8");
    if (tail && tail > 0) {
      const lines = content.split("\n");
      return lines.slice(-tail).join("\n");
    }
    return content;
  } catch {
    return "";
  }
}

export async function listArtifacts(jobId: string): Promise<string[]> {
  const outputsDir = path.join(getJobDir(jobId), "outputs");
  try {
    const entries = await fs.readdir(outputsDir);
    return entries;
  } catch {
    return [];
  }
}

/**
 * Get artifact file path with security validation.
 *
 * SECURITY: Validates filename before constructing path to prevent
 * path traversal attacks on artifact downloads.
 */
export async function getArtifactPath(
  jobId: string,
  fileName: string
): Promise<string | null> {
  // SECURITY: Validate filename before constructing path
  const result = safeFilename(fileName);
  if (result.error) {
    return null;
  }

  const filePath = path.join(getJobDir(jobId), "outputs", result.safe!);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}
