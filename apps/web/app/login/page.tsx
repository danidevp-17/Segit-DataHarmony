"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  // Con Microsoft configurado, el usuario debe setear NEXT_PUBLIC_USE_MICROSOFT_AUTH=true
  const useMicrosoft = process.env.NEXT_PUBLIC_USE_MICROSOFT_AUTH === "true";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-800">DataHarmony</h1>
        <p className="mb-6 text-sm text-slate-500">Inicia sesión para continuar</p>

        {useMicrosoft ? (
          <button
            onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2F2F2F] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a]"
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="currentColor">
              <path d="M0 0h10v10H0zM11 0h10v10H11zM0 11h10v10H0zM11 11h10v10H11z" fill="#F35325" />
              <path d="M11 0h10v10H11z" fill="#81BC06" />
              <path d="M0 11h10v10H0z" fill="#05A6F0" />
              <path d="M11 11h10v10H11z" fill="#FFBA08" />
            </svg>
            Continuar con Microsoft
          </button>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
              if (email) {
                await signIn("credentials", {
                  email,
                  callbackUrl: "/",
                });
              }
            }}
            className="space-y-4"
          >
            <input
              name="email"
              type="email"
              placeholder="dev@example.com"
              required
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Entrar (modo desarrollo)
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-slate-400">
          {useMicrosoft
            ? "Usando Microsoft Entra ID (Azure AD)"
            : "Modo desarrollo: usa cualquier email para entrar"}
        </p>
      </div>
    </div>
  );
}
