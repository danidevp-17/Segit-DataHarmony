import type { ReactNode } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";
import NavTracker from "./NavTracker";

type LayoutShellProps = {
  children: ReactNode;
};

export default function LayoutShell({ children }: LayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavTracker />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto px-6 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
