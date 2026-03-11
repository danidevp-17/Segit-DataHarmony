import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SETTINGS_PATH = join(process.cwd(), "data", "settings.json");

type SettingsPayload = {
  OW_HOME: string;
  WORKSPACE_ROOT: string;
  OW_ENV_SCRIPT?: string;
  DEFAULT_DIST?: string;
  DEFAULT_PD_OW?: string;
  DEFAULT_IP_OW?: string;
  DEFAULT_INTERP_ID?: string;
};

const defaultSettings: SettingsPayload = {
  OW_HOME: "",
  WORKSPACE_ROOT: "",
  OW_ENV_SCRIPT: "",
  DEFAULT_DIST: "",
  DEFAULT_PD_OW: "",
  DEFAULT_IP_OW: "",
  DEFAULT_INTERP_ID: "",
};

const readSettings = async (): Promise<SettingsPayload> => {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SettingsPayload;
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { ...defaultSettings };
    }
    throw error;
  }
};

export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to read settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SettingsPayload;

    if (!payload?.OW_HOME?.trim() || !payload?.WORKSPACE_ROOT?.trim()) {
      return NextResponse.json(
        { message: "OW_HOME and WORKSPACE_ROOT are required." },
        { status: 400 }
      );
    }

    const settings: SettingsPayload = {
      ...defaultSettings,
      ...payload,
      OW_HOME: payload.OW_HOME.trim(),
      WORKSPACE_ROOT: payload.WORKSPACE_ROOT.trim(),
    };

    await mkdir(dirname(SETTINGS_PATH), { recursive: true });
    await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to save settings." },
      { status: 500 }
    );
  }
}
