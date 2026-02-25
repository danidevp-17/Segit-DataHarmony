"use client";

import { Bell, HelpCircle, ChevronDown } from "lucide-react";

export default function Header() {
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
        <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-xs font-semibold text-white shadow-sm">
            JC
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-slate-700">John Carter</p>
            <p className="text-[11px] text-slate-400">Operations</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
