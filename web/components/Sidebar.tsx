"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { navigation, NavItem, NavGroup, getModuleById } from "@/lib/nav";
import { usePinnedModules } from "@/lib/usePinnedModules";

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "children" in item;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const { pinned, unpin } = usePinnedModules();

  // Prevent hydration mismatch by only showing pinned modules after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if a route is active
  const isRouteActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // Get modules to display: Home (fixed), Chatbot (fixed), and pinned modules
  const homeItem = navigation.find((item) => !isNavGroup(item) && item.href === "/") as NavItem | undefined;
  const chatbotModule = navigation.find((item) => isNavGroup(item) && "id" in item && item.id === "chatbot") as NavGroup | undefined;
  // Only get pinned modules after mount to prevent hydration mismatch
  const pinnedModules = mounted
    ? pinned
        .map((id) => getModuleById(id))
        .filter((module): module is NavGroup => module !== null && module.id !== "chatbot")
    : [];

  // Auto-expand groups with active children on mount and pathname change
  useEffect(() => {
    if (!mounted) return;
    
    const activeGroups = new Set<string>();
    // Recompute pinnedModules here to avoid dependency on array reference
    const currentPinnedModules = pinned
      .map((id) => getModuleById(id))
      .filter((module): module is NavGroup => module !== null && module.id !== "chatbot");
    const allDisplayedModules = [chatbotModule, ...currentPinnedModules].filter(Boolean) as NavGroup[];
    
    allDisplayedModules.forEach((item) => {
      if (item) {
        const hasActiveChild = item.children.some((child) => isRouteActive(child.href));
        if (hasActiveChild) {
          activeGroups.add(item.label);
        }
      }
    });
    setExpandedGroups(activeGroups);
  }, [pathname, pinned, chatbotModule, mounted]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  };

  const handleUnpin = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    unpin(moduleId);
  };

  const renderNavGroup = (item: NavGroup, showUnpin: boolean = false) => {
    const isExpanded = expandedGroups.has(item.label);
    const isActive = item.children.some((child) => isRouteActive(child.href));
    const GroupIcon = item.icon;

    return (
      <div key={item.id || item.label}>
        <div className="flex items-center group">
          <button
            onClick={() => toggleGroup(item.label)}
            className={`flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <GroupIcon
              className={`h-[18px] w-[18px] flex-shrink-0 ${
                isActive
                  ? "text-cyan-600"
                  : "text-slate-400 group-hover:text-slate-600"
              }`}
            />
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showUnpin && (
            <button
              onClick={(e) => handleUnpin(e, item.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              title="Unpin module"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isExpanded && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-2">
            {item.children.map((child) => {
              const isChildActive = isRouteActive(child.href);
              const ChildIcon = child.icon;

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isChildActive
                      ? "bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700 border-l-[3px] border-cyan-600 -ml-[3px] pl-[15px]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <ChildIcon
                    className={`h-[16px] w-[16px] ${
                      isChildActive
                        ? "text-cyan-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-white border-r border-slate-200/80">
      {/* Logo / Brand */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 shadow-sm">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800">DataHarmony Automation Hub</h1>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        <div className="flex flex-col gap-1">
          {/* Home - Always visible */}
          {homeItem && (
            <Link
              href={homeItem.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isRouteActive(homeItem.href)
                  ? "bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700 border-l-[3px] border-cyan-600 -ml-[3px] pl-[15px]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <homeItem.icon
                className={`h-[18px] w-[18px] ${
                  isRouteActive(homeItem.href)
                    ? "text-cyan-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              {homeItem.label}
            </Link>
          )}

          {/* Chatbot - Always visible, fixed */}
          {chatbotModule && renderNavGroup(chatbotModule, false)}

          {/* Pinned Modules Section */}
          {pinnedModules.length > 0 && (
            <>
              <div className="px-3 mt-3 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Pinned
                </p>
              </div>
              {pinnedModules.map((module) => renderNavGroup(module, true))}
            </>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-[10px] text-slate-400">
          © {mounted ? new Date().getFullYear() : 2026} Halliburton-Landmark Operations
        </p>
        <p className="text-[10px] text-slate-300 mt-0.5">
          v1.0.0
        </p>
      </div>
    </aside>
  );
}
