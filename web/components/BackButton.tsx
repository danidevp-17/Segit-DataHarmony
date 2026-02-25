"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const STORAGE_KEY = "segit:navDepth";

export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window === "undefined") {
      router.push("/");
      return;
    }

    const navDepth = sessionStorage.getItem(STORAGE_KEY);
    const depth = navDepth ? parseInt(navDepth, 10) : 0;

    if (depth > 1) {
      // Decrement depth before going back
      const newDepth = Math.max(1, depth - 1);
      sessionStorage.setItem(STORAGE_KEY, newDepth.toString());
      // Set flag so NavTracker knows we're going back
      sessionStorage.setItem("segit:isGoingBack", "true");
      router.back();
    } else {
      // Reset depth and go to home
      sessionStorage.setItem(STORAGE_KEY, "1");
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      title="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
