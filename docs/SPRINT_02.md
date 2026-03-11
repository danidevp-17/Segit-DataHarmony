# Sprint 2 — Autenticación y seguridad

**Objetivo:** Autenticación con Azure AD / Microsoft Entra ID en Next.js, validación JWT en FastAPI, protección de rutas y cliente API con token.

---

## Tareas ejecutadas

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| T-10 | Instalar next-auth v5 (Auth.js) | ✅ |
| T-11 | Configurar Microsoft Entra ID provider | ✅ |
| T-12 | Middleware de protección de rutas | ✅ |
| T-13 | Cliente HTTP hacia FastAPI con token | ✅ |
| T-14 | Validación JWT en FastAPI | ✅ |
| T-15 | JWKS caching (PyJWKClient) | ✅ |

---

## Next.js

### Auth (auth.ts)
- **Microsoft Entra ID** como proveedor principal (antes Azure AD)
- **Credentials** como fallback en desarrollo cuando Azure no está configurado
- Callbacks: `jwt` (guarda access_token), `session` (expone accessToken), `authorized` (protege rutas)
- Estrategia JWT, sesión 24h

### Login (app/login/page.tsx)
- Modo Microsoft: botón "Continuar con Microsoft"
- Modo desarrollo: formulario con email (cuando `NEXT_PUBLIC_USE_MICROSOFT_AUTH` no es true)

### Middleware
- Protege todas las rutas excepto `/login`, `/api/auth`, assets estáticos
- Redirige a `/login` si no hay sesión

### Cliente API (lib/api/)
- `client.ts`: `apiGet`, `apiPost`, `apiPut`, `apiDelete` con `Authorization: Bearer <token>`
- `registry.ts`: `getAppModules(accessToken)`

### Header
- Muestra usuario de sesión (nombre/email)
- Botón cerrar sesión

---

## FastAPI

### core/security.py
- `decode_azure_token()`: valida JWT contra JWKS de Microsoft
- `get_current_user`: dependencia que extrae `UserContext` (oid, email, name, groups)
- **PyJWKClient**: cache de claves (1h), no llama a Microsoft en cada request
- **auth_skip_validation**: cuando `true`, acepta requests sin token (usuario dev) para desarrollo local

### Endpoints protegidos
- `GET /api/v1/registry/modules` requiere autenticación

### Config (core/config.py)
- `azure_tenant_id`, `azure_client_id`, `auth_skip_validation`

---

## Variables de entorno

### Web (apps/web/.env.local)
```bash
AUTH_SECRET=           # npx auth secret
AUTH_MICROSOFT_ENTRA_ID_ID=
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<TENANT_ID>/v2.0
NEXT_PUBLIC_USE_MICROSOFT_AUTH=true   # false para usar Credentials en dev
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### API
```bash
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AUTH_SKIP_VALIDATION=true   # dev sin Azure
```

---

## Flujo

1. Usuario visita app → middleware verifica sesión
2. Sin sesión → redirige a /login
3. Login con Microsoft o Credentials (dev)
4. NextAuth guarda access_token (Microsoft) en sesión
5. Cliente API envía `Authorization: Bearer <token>` a FastAPI
6. FastAPI valida JWT con JWKS (cacheadas)
7. Endpoints reciben `UserContext` vía Depends

---

## Tradeoffs

| Decisión | Razón |
|----------|-------|
| Credentials provider en dev | Permite desarrollar sin tenant Azure |
| auth_skip_validation en Docker | API funcional sin configurar Azure |
| PyJWT + PyJWKClient | JWKS cache integrado, no llamadas a Microsoft por request |
| Sesión JWT en NextAuth | Sin base de datos de sesiones, más simple |

---

## Próximos pasos (Sprint 3)

- Migrar módulo Admin/DataSources a FastAPI
- Conectar lib/api/client a llamadas reales desde componentes
- Opcional: navegación dinámica desde `/api/v1/registry/modules`
