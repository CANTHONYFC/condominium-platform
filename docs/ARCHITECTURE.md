# Arquitectura — Condominium Platform

## Visión general

Sistema ERP SaaS multi-tenant donde cada **Empresa Administradora** (tenant) gestiona múltiples **Condominios** de forma completamente aislada.

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular Frontend                         │
│  Signals · Lazy Loading · Guards · Interceptors · PWA        │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                     NestJS API Layer                         │
│  Controllers → Services → Repositories → Prisma              │
└─────────────────────────┬───────────────────────────────────┘
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    PostgreSQL         Redis          WebSocket
    (datos)         (cache/colas)    (dashboard RT)
```

## Multi-tenancy

**Estrategia:** Shared Database + Row-Level Isolation

| Capa | Mecanismo |
|------|-----------|
| Base de datos | Columna `tenantId` en todas las tablas de negocio |
| API | JWT contiene `tenantId`; servicios filtran automáticamente |
| RBAC | Permisos granulares `modulo:accion` |
| Condominio | Columna `condominiumId` en entidades de ámbito local |

### Jerarquía de datos

```
Tenant (Empresa Administradora)
 └── Condominium
      ├── Tower / Block
      │    └── Floor
      │         └── Unit (Departamento | Cochera | Depósito)
      ├── CommonArea
      ├── Owner → UnitOwnership
      ├── Resident → Pet
      ├── StaffMember
      ├── MaintenanceFee → Payment
      ├── Ticket / Incident
      ├── Reservation
      ├── Visit (QR)
      └── ... (26 módulos)
```

## Clean Architecture (Backend)

```
src/
├── common/           # DTOs, decorators, guards, filters, interceptors
├── config/           # Configuración tipada
├── infrastructure/   # Prisma, Redis, WebSocket, colas
└── modules/          # Módulos de dominio (26)
    └── {module}/
        ├── {module}.controller.ts   # Capa presentación
        ├── {module}.service.ts      # Lógica de negocio
        ├── dto/                     # Validación class-validator
        └── repository (opcional)    # Acceso a datos
```

### Patrones aplicados

- **Repository Pattern:** `BaseRepository` con paginación, soft delete, búsqueda
- **SOLID:** Módulos independientes, inyección de dependencias
- **DTOs:** Validación en boundary con `class-validator`
- **Soft Delete:** Campo `deletedAt` + filtro automático
- **Auditoría:** `AuditInterceptor` registra CREATE/UPDATE/DELETE

## Seguridad

| Feature | Implementación |
|---------|----------------|
| Autenticación | JWT (15m) + Refresh Token (7d) |
| Sesiones | `UserSession` con revocación |
| RBAC | Role → Permission → UserRole |
| 2FA | Campo preparado en schema (`twoFactorEnabled`) |
| Historial accesos | `AccessLog` |
| Recuperación contraseña | `PasswordResetToken` (pendiente endpoint) |

## Escalabilidad

- **Paginación:** `PaginationQueryDto` con page/limit/sort/search
- **Índices:** En `tenantId`, `condominiumId`, `deletedAt`, fechas
- **Cache:** Redis global via `@nestjs/cache-manager`
- **Colas:** Bull para tareas async (notificaciones, exports)
- **WebSockets:** Namespace `/events` para KPIs en tiempo real

## Modelo de datos

Schema Prisma con **40+ modelos** cubriendo los 26 módulos:

- Enums tipados para estados (TicketStatus, PaymentStatus, etc.)
- Relaciones normalizadas
- JSON para configuraciones flexibles
- Correlativos por módulo para numeración de documentos

## Frontend

```
src/app/
├── core/           # Auth, Theme, Guards, Interceptors
├── features/       # Módulos lazy-loaded por dominio
├── layout/         # Shell con sidenav responsive
└── shared/         # Componentes reutilizables
```

- **Signals** para estado reactivo (auth, theme)
- **Dark Mode** via Tailwind `dark:` + `ThemeService`
- **Standalone Components** (sin NgModules)
- **Lazy Loading** preparado en rutas

## Roadmap de implementación

### Fase 1 — Fundación ✅
- [x] Monorepo, Docker, Prisma schema
- [x] Auth JWT + RBAC
- [x] Tenants + Condominiums CRUD
- [x] Dashboard KPIs
- [x] Frontend login + layout

### Fase 2 — Core operativo
- [ ] Estructura condominio (torres, pisos, unidades)
- [ ] Propietarios y residentes
- [ ] Finanzas y facturación
- [ ] Exportación Excel/PDF

### Fase 3 — Operaciones
- [ ] Tickets, incidencias, reservas
- [ ] Visitas con QR
- [ ] Comunicaciones y notificaciones

### Fase 4 — Avanzado
- [ ] Inventario, compras, contratos
- [ ] Encuestas y asambleas
- [ ] Reportes avanzados
- [ ] PWA completa

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| Prisma 7 + adapter-pg | ORM type-safe, migraciones, Prisma 7 sin Rust engine |
| Shared DB vs DB/tenant | Costo operativo menor, escala a miles de tenants con índices |
| Angular 19 vs 20 | Angular 20 aún no estable en CLI; upgrade path directo |
| Sin pasarelas de pago | Requisito explícito del cliente |
| Bull vs BullMQ | Integración nativa NestJS @nestjs/bull |
