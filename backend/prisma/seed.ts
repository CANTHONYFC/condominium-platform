import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'
import 'dotenv/config'

import { seedSystemRoles } from './lib/seed-system-roles'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const PERMISSIONS = [
  'tenants:read', 'tenants:create', 'tenants:update', 'tenants:delete',
  'condominiums:read', 'condominiums:create', 'condominiums:update', 'condominiums:delete',
  'dashboard:read',
  'owners:read', 'owners:create', 'owners:update', 'owners:delete',
  'residents:read', 'residents:create', 'residents:update', 'residents:delete',
  'units:read', 'units:create', 'units:update', 'units:delete',
  'finance:read', 'finance:create', 'finance:update', 'finance:delete',
  'exports:read', 'exports:create',
  'reservations:read', 'reservations:create', 'reservations:update', 'reservations:delete',
  'calendar:read', 'calendar:create', 'calendar:update', 'calendar:delete',
  'documents:read', 'documents:create',
  'users:read', 'users:create', 'users:update', 'users:delete',
  'roles:read', 'roles:create', 'roles:update',
  'staff:read', 'billing:read', 'billing:create', 'billing:update',
  'communications:read', 'helpdesk:read',
  'incidents:read', 'visits:read', 'vehicles:read',
  'correspondence:read', 'inventory:read', 'purchases:read', 'contracts:read',
  'surveys:read', 'reports:read', 'settings:read', 'settings:update',
]

async function main () {
  for (const code of PERMISSIONS) {
    const [module, action] = code.split(':')
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, module, action, description: `${module} ${action}` },
    })
  }

  const tenant = await prisma.tenant.upsert({
    where: { code: 'demo' },
    update: { maxUsers: 100, organizationType: 'MANAGEMENT_FIRM' },
    create: {
      code: 'demo',
      name: 'Empresa Demo',
      legalName: 'Administradora Demo S.A.C.',
      email: 'contacto@demo.com',
      taxId: '20123456789',
      organizationType: 'MANAGEMENT_FIRM',
      maxUsers: 100,
    },
  })

  await seedSystemRoles(prisma, tenant.id, true)

  const adminGeneralRole = await prisma.role.findFirstOrThrow({
    where: { tenantId: tenant.id, code: 'ADMIN_GENERAL' },
  })

  const passwordHash = await bcrypt.hash('Admin123!', 12)
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Demo',
      status: 'ACTIVE',
    },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminGeneralRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminGeneralRole.id },
  })

  // Demo condominium
  const condo = await prisma.condominium.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'COND-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'COND-01',
      name: 'Torres del Sol',
      address: 'Av. Principal 123',
      city: 'Lima',
    },
  })

  const tower = await prisma.tower.upsert({
    where: { condominiumId_code: { condominiumId: condo.id, code: 'T1' } },
    update: {},
    create: {
      tenantId: tenant.id,
      condominiumId: condo.id,
      code: 'T1',
      name: 'Torre 1',
      floorsCount: 5,
    },
  })

  const ownerNames = [
    'Maria del Pilar Gutierrez',
    'Juan Carlos Mendoza',
    'Ana Lucia Torres',
    'Roberto Silva',
    'Carmen Vargas',
    'Pedro Ramirez',
    'Lucia Fernandez',
    'Diego Morales',
    'Elena Castillo',
    'Fernando Rojas',
  ]

  const unitCodes = ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502']
  let ownersCount = 0

  for (let f = 1; f <= 5; f++) {
    let floor = await prisma.floor.findFirst({
      where: { condominiumId: condo.id, number: f, deletedAt: null },
    })
    if (!floor) {
      floor = await prisma.floor.create({
        data: {
          tenantId: tenant.id,
          condominiumId: condo.id,
          towerId: tower.id,
          number: f,
          name: `Piso ${f}`,
        },
      })
    }

    for (const suffix of ['01', '02']) {
      const code = `${f}${suffix}`
      const idx = unitCodes.indexOf(code)
      if (idx < 0) continue

      const unit = await prisma.unit.upsert({
        where: { condominiumId_code: { condominiumId: condo.id, code } },
        update: { occupancyStatus: 'OCCUPIED', floorId: floor.id },
        create: {
          tenantId: tenant.id,
          condominiumId: condo.id,
          floorId: floor.id,
          code,
          type: 'APARTMENT',
          bedrooms: 3,
          bathrooms: 2,
          area: 85,
          occupancyStatus: 'OCCUPIED',
          maintenanceFee: 241.94,
        },
      })

      const parts = ownerNames[idx].split(' ')
      const owner = await prisma.owner.upsert({
        where: {
          tenantId_documentType_documentNumber: {
            tenantId: tenant.id,
            documentType: 'DNI',
            documentNumber: `${10000000 + idx}`,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          type: 'NATURAL',
          documentType: 'DNI',
          documentNumber: `${10000000 + idx}`,
          firstName: parts.slice(0, -2).join(' ') || parts[0],
          lastName: parts.slice(-2).join(' ') || parts[parts.length - 1],
          email: `propietario${idx + 1}@demo.com`,
          phone: `999000${String(idx).padStart(3, '0')}`,
        },
      })
      ownersCount++

      const existingOwnership = await prisma.unitOwnership.findFirst({
        where: { unitId: unit.id, ownerId: owner.id, deletedAt: null },
      })
      if (!existingOwnership) {
        await prisma.unitOwnership.create({
          data: {
            tenantId: tenant.id,
            unitId: unit.id,
            ownerId: owner.id,
            isPrimary: true,
            sharePercent: 100,
          },
        })
      }
    }
  }

  await prisma.condominium.update({
    where: { id: condo.id },
    data: { totalUnits: unitCodes.length },
  })

  const defaultConcepts = [
    { code: 'ADMIN', name: 'Administración y Conserje', type: 'FIXED' as const, sortOrder: 1 },
    { code: 'CLEAN', name: 'Limpieza', type: 'FIXED' as const, sortOrder: 2 },
    { code: 'WATER', name: 'Agua recibo', type: 'VARIABLE' as const, sortOrder: 3 },
    { code: 'LIGHT', name: 'Luz común', type: 'FIXED' as const, sortOrder: 4 },
    { code: 'ELEV', name: 'Mant. Ascensor', type: 'FIXED' as const, sortOrder: 5 },
    { code: 'EXTRA', name: 'Bolsa extraordinarios', type: 'FIXED' as const, sortOrder: 6 },
    { code: 'FINE', name: 'Multa', type: 'VARIABLE' as const, sortOrder: 7 },
    { code: 'DEBT', name: 'Deuda pendiente', type: 'VARIABLE' as const, sortOrder: 8 },
  ]

  for (const c of defaultConcepts) {
    await prisma.chargeConcept.upsert({
      where: { condominiumId_code: { condominiumId: condo.id, code: c.code } },
      update: { name: c.name, type: c.type, sortOrder: c.sortOrder },
      create: {
        tenantId: tenant.id,
        condominiumId: condo.id,
        code: c.code,
        name: c.name,
        type: c.type,
        sortOrder: c.sortOrder,
      },
    })
  }

  console.log('Seed completed')
  console.log('Tenant code: demo')
  console.log('Login: admin@demo.com / Admin123!')
  console.log('Condominium: COND-01')
  console.log(`Units: ${unitCodes.length} | Owners: ${ownersCount}`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
