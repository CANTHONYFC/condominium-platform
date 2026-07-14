# Condominium Platform

SaaS multi-tenant para administración de condominios. Arquitectura empresarial con aislamiento estricto por empresa administradora.

## Estructura

```
condominium-platform/
├── backend/          # NestJS 11 + Prisma 7 + PostgreSQL
├── frontend/         # Angular 19 + Material + TailwindCSS
├── docker-compose.yml
└── docs/
    └── ARCHITECTURE.md
```

## Requisitos

- Node.js 22+
- Docker Desktop (PostgreSQL + Redis)
- npm

## Inicio rápido

```bash
# 1. Infraestructura
cd C:\proyectos\condominium-platform
docker compose up -d

# 2. Backend
cd backend
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev

# 3. Frontend (otra terminal)
cd frontend
npm install
npm start
```

## URLs

| Servicio | URL |
|----------|-----|
| API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/docs |
| Frontend | http://localhost:4200 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

## Credenciales demo

- **Tenant:** `demo`
- **Email:** `admin@demo.com`
- **Password:** `Admin123!`

## Módulos implementados

| # | Módulo | Backend | Frontend |
|---|--------|---------|----------|
| 1 | Autenticación | ✅ JWT + Refresh + Sesiones | ✅ Login |
| 2 | Empresas | ✅ CRUD | 🔲 |
| 3 | Condominios | ✅ CRUD + estructura completa | ✅ Lista + estructura |
| 4 | Propietarios | ✅ CRUD + historial + documentos | ✅ Lista + export |
| 5 | Residentes | ✅ CRUD + historial + documentos + mascotas | 🔲 |
| 6 | Finanzas | ✅ Cuotas, pagos, estado cuenta, PDF, morosidad | ✅ Lista cuotas |
| 7 | Exportación | ✅ Excel/PDF async con Bull | ✅ Desde propietarios |

✅ = funcional base | 🔲 = scaffolding listo para desarrollo

## Stack

**Backend:** NestJS, TypeScript, Prisma, PostgreSQL, JWT, RBAC, Swagger, Redis, Bull, WebSockets, Clean Architecture

**Frontend:** Angular 19, Material, TailwindCSS, Signals, Standalone Components, Guards, Interceptors, Dark Mode

## Multi-tenancy

- Shared database con `tenantId` en todas las entidades
- JWT incluye `tenantId` y permisos
- Guards RBAC por acción (`module:action`)
- Soft delete (`deletedAt`) en entidades principales
- Auditoría automática vía interceptor

## Excluido (por diseño)

- Pasarelas de pago
- Reconocimiento de placas
- Biometría / huellas
- Cámaras de vigilancia
- IA reconocimiento facial

## Licencia

Privado — uso interno del proyecto.
