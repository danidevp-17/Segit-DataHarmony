"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

type SessionWithToken = {
  accessTokenExpiresAt?: number;
};

const PUBLIC_PATHS = new Set(["/login"]);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const redirectingRef = useRef(false);
  const [nowTs, setNowTs] = useState<number | null>(null);

  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const accessTokenExpiresAt = (session as SessionWithToken | null)?.accessTokenExpiresAt;
  const isExpired =
    typeof accessTokenExpiresAt === "number" && typeof nowTs === "number"
      ? nowTs >= accessTokenExpiresAt
      : false;

  useEffect(() => {
    if (isPublicPath) return;
    setNowTs(Date.now());
  }, [accessTokenExpiresAt, isPublicPath, status]);

  useEffect(() => {
    if (isPublicPath || redirectingRef.current) return;

    if (status === "unauthenticated" || (status === "authenticated" && isExpired)) {
      redirectingRef.current = true;
      void signOut({ callbackUrl: "/login" });
    }
  }, [isExpired, isPublicPath, status]);

  if (!isPublicPath && (status === "loading" || status === "unauthenticated" || isExpired)) {
    return null;
  }

  return <>{children}</>;
}
