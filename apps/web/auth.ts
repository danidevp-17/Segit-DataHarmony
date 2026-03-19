/**
 * Auth.js (next-auth v5) - Configuración de autenticación
 * Microsoft Entra ID (Azure AD) como proveedor principal.
 */
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";

const useMicrosoftAuth =
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;

const providers = [
  ...(useMicrosoftAuth
    ? [
        MicrosoftEntraID({
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
          authorization: {
            params: {
              scope: "openid profile email User.Read",
            },
          },
        }),
      ]
    : []),
  // Credentials solo para desarrollo cuando Azure AD no está configurado
  ...(process.env.NODE_ENV === "development" && !useMicrosoftAuth
    ? [
        Credentials({
          name: "Development",
          credentials: {
            email: { label: "Email", type: "text" },
          },
          async authorize(credentials) {
            if (!credentials?.email) return null;
            return {
              id: "dev-user",
              email: credentials.email as string,
              name: "Dev User",
            };
          },
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, account, user }) {
      if (account?.expires_at) {
        token.accessTokenExpiresAt = account.expires_at * 1000;
      }
      // El id_token tiene aud=client_id (validable por FastAPI).
      // El access_token es para Graph API (aud=graph.microsoft.com) y falla la validación del backend.
      if (account?.id_token) {
        token.accessToken = account.id_token;
      } else if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      if (
        typeof token.accessTokenExpiresAt === "number" &&
        Date.now() >= token.accessTokenExpiresAt
      ) {
        delete token.accessToken;
        token.authError = "AccessTokenExpired";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      (session as SessionWithToken).accessToken = token.accessToken as string | undefined;
      (session as SessionWithToken).accessTokenExpiresAt =
        typeof token.accessTokenExpiresAt === "number" ? token.accessTokenExpiresAt : undefined;
      (session as SessionWithToken).authError = token.authError as string | undefined;
      return session;
    },
    authorized({ auth: authResult, request }) {
      const { pathname } = request.nextUrl;
      const isLoginPage = pathname === "/login";
      if (isLoginPage) return true;
      if (authResult) {
        const accessTokenExpiresAt = (authResult as SessionWithToken).accessTokenExpiresAt;
        if (typeof accessTokenExpiresAt === "number" && Date.now() >= accessTokenExpiresAt) {
          return false;
        }
        return true;
      }
      return false;
    },
  },
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },
});

export type SessionWithToken = {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  authError?: string;
  user?: { id?: string; name?: string | null; email?: string | null; image?: string | null };
  expires?: string;
};
