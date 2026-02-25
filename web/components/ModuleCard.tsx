"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Pin, PinOff } from "lucide-react";
import { getModuleById } from "@/lib/nav";
import { usePinnedModules } from "@/lib/usePinnedModules";

interface ModuleCardProps {
  moduleId: string;
  description: string;
}

export default function ModuleCard({ moduleId, description }: ModuleCardProps) {
  const [mounted, setMounted] = useState(false);
  const { isPinned, pin, unpin } = usePinnedModules();
  const module = getModuleById(moduleId);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!module) {
    return null;
  }
  
  const Icon = module.icon;
  const firstChild = module.children[0];
  const isChatbot = module.id === "chatbot";
  // Only check pin status after mount to prevent hydration mismatch
  const pinned = mounted ? isPinned(module.id) : false;

  const handlePinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pinned) {
      unpin(module.id);
    } else {
      pin(module.id);
    }
  };

  return (
    <Link
      href={firstChild.href}
      className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 text-cyan-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
              {module.label}
            </h3>
            {!isChatbot && (
              <button
                onClick={handlePinToggle}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors"
                title={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
              >
                {pinned ? (
                  <Pin className="h-4 w-4 fill-current" />
                ) : (
                  <PinOff className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">
        Open module
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
