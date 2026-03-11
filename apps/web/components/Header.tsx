"use client";

import { Bell, HelpCircle, ChevronDown, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || session?.user?.email?.[0]?.toUpperCase() || "?";

  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-3">
      {/* Left side - Breadcrumb / Title */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-800">
          DataHarmony Automation Hub
        </h1>
      </div>

      {/* Right side - Actions & User */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="mx-2 h-8 w-px bg-slate-200" />

        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-xs font-semibold text-white shadow-sm">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-700">
                {session?.user?.name || session?.user?.email || "Usuario"}
              </p>
              <p className="text-[11px] text-slate-400">
                {session?.user?.email || "Sesión activa"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
