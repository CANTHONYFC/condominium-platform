import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { BullModule } from '@nestjs/bull'
import { CacheModule } from '@nestjs/cache-manager'
import { ScheduleModule } from '@nestjs/schedule'

import configuration from './config/configuration'
import { CommonModule } from './common/common.module'
import { DatabaseModule } from './infrastructure/database/database.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { AuditInterceptor } from './common/interceptors/audit.interceptor'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { AuthModule } from './modules/auth/auth.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { CondominiumsModule } from './modules/condominiums/condominiums.module'
import { StructureModule } from './modules/structure/structure.module'
import { ExportsModule } from './modules/exports/exports.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { OwnersModule } from './modules/owners/owners.module'
import { ResidentsModule } from './modules/residents/residents.module'
import { UnitsModule } from './modules/units/units.module'
import { StaffModule } from './modules/staff/staff.module'
import { UsersModule } from './modules/users/users.module'
import { FinanceModule } from './modules/finance/finance.module'
import { BillingModule } from './modules/billing/billing.module'
import { RolesModule } from './modules/roles/roles.module'
import { CommunicationsModule } from './modules/communications/communications.module'
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module'
import { IncidentsModule } from './modules/incidents/incidents.module'
import { ReservationsModule } from './modules/reservations/reservations.module'
import { VisitsModule } from './modules/visits/visits.module'
import { VehiclesModule } from './modules/vehicles/vehicles.module'
import { CorrespondenceModule } from './modules/correspondence/correspondence.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { PurchasesModule } from './modules/purchases/purchases.module'
import { ContractsModule } from './modules/contracts/contracts.module'
import { DocumentsModule } from './modules/documents/documents.module'
import { SurveysModule } from './modules/surveys/surveys.module'
import { CalendarModule } from './modules/calendar/calendar.module'
import { CommonAreasModule } from './modules/common-areas/common-areas.module'
import { EmailModule } from './modules/email/email.module'
import { ExpensesModule } from './modules/expenses/expenses.module'
import { StorageModule } from './modules/storage/storage.module'
import { ReportsModule } from './modules/reports/reports.module'
import { SettingsModule } from './modules/settings/settings.module'
import { HealthModule } from './modules/health/health.module'
import { PortalModule } from './modules/portal/portal.module'
import { EventsGateway } from './infrastructure/websocket/events.gateway'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    CacheModule.register({ isGlobal: true }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    DatabaseModule,
    CommonModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    CondominiumsModule,
    StructureModule,
    ExportsModule,
    DashboardModule,
    OwnersModule,
    ResidentsModule,
    UnitsModule,
    StaffModule,
    UsersModule,
    FinanceModule,
    ExpensesModule,
    StorageModule,
    CommonAreasModule,
    EmailModule,
    BillingModule,
    RolesModule,
    CommunicationsModule,
    HelpdeskModule,
    IncidentsModule,
    ReservationsModule,
    VisitsModule,
    VehiclesModule,
    CorrespondenceModule,
    InventoryModule,
    PurchasesModule,
    ContractsModule,
    DocumentsModule,
    SurveysModule,
    CalendarModule,
    ReportsModule,
    SettingsModule,
    PortalModule,
  ],
  providers: [
    EventsGateway,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
