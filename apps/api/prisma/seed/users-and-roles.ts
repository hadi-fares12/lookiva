import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_MAP,
  UserRole,
} from '@lookiva/shared-types';

export const SALT_ROUNDS = 12;

export let SUPER_ADMIN_USER_ID: string = '';
export let BUSINESS_OWNER_USER_ID: string = '';
export let CUSTOMER_USER_ID: string = '';

export async function seedUsersAndRoles(prisma: PrismaClient, includeDemoUsers = true) {
  console.log('\n=== Seeding Users, Roles & Permissions ===');

  await prisma.$transaction(async (tx) => {
    const permissionIds: Record<string, string> = {};
    for (const permission of PERMISSION_DEFINITIONS) {
      const perm = await tx.permissions.upsert({
        where: { key: permission.key },
        create: {
          key: permission.key,
          scope_type: permission.scopeType,
          name: permission.name,
          description: permission.description,
          group: permission.group,
        },
        update: {},
      });
      permissionIds[permission.key] = perm.id;
    }
    console.log(`  Permissions: ${Object.keys(permissionIds).length} defined`);

    for (const roleDef of ROLE_DEFINITIONS) {
      const role = await tx.roles.upsert({
        where: { key: roleDef.key },
        create: {
          key: roleDef.key,
          scope_type: roleDef.scopeType,
          name: roleDef.name,
          description: roleDef.description,
          is_system: roleDef.isSystem,
        },
        update: {},
      });

      for (const pKey of ROLE_PERMISSION_MAP[roleDef.key]) {
        const permId = permissionIds[pKey];
        if (permId) {
          await tx.role_permissions.upsert({
            where: {
              role_id_permission_id: {
                role_id: role.id,
                permission_id: permId,
              },
            },
            create: {
              role_id: role.id,
              permission_id: permId,
            },
            update: {},
          });
        }
      }
    }
    console.log(`  Roles: ${ROLE_DEFINITIONS.length} roles with permissions assigned`);

    if (!includeDemoUsers) {
      console.log('  Demo users skipped (reference-data-only seed)');
      return;
    }

    const lbCountry = await tx.countries.findUnique({ where: { iso_code: 'LB' } });
    if (!lbCountry) {
      throw new Error('Lebanon country not found. Run geo-lebanon seed first.');
    }
    const beirutCity = await tx.cities.findFirst({ where: { country_id: lbCountry.id, name: 'Beirut' } });

    const superAdminHash = bcrypt.hashSync('Admin123!', SALT_ROUNDS);
    const superAdmin = await tx.users.upsert({
      where: { email: 'super@lookiva.dev' },
      create: {
        email: 'super@lookiva.dev',
        email_verified_at: new Date(),
        password_hash: superAdminHash,
        full_name: 'Super Admin',
        locale: 'en',
        is_active: true,
      },
      update: {},
    });
    SUPER_ADMIN_USER_ID = superAdmin.id;

    const superAdminRole = await tx.roles.findUnique({
      where: { key: UserRole.SuperAdmin },
    });
    if (superAdminRole) {
      await tx.user_role_scopes.upsert({
        where: {
          user_id_role_id_scope_type_scope_id: {
            user_id: superAdmin.id,
            role_id: superAdminRole.id,
            scope_type: 'platform',
            scope_id: 'platform',
          },
        },
        create: {
          user_id: superAdmin.id,
          role_id: superAdminRole.id,
          role_key: UserRole.SuperAdmin,
          scope_type: 'platform',
          scope_id: 'platform',
        },
        update: {},
      });
    }
    console.log('  User: Super Admin created');

    const bizOwnerHash = bcrypt.hashSync('Biz123!', SALT_ROUNDS);
    const bizOwner = await tx.users.upsert({
      where: { email: 'owner@hadibarber.lb' },
      create: {
        email: 'owner@hadibarber.lb',
        phone: '+96170111222',
        email_verified_at: new Date(),
        phone_verified_at: new Date(),
        password_hash: bizOwnerHash,
        full_name: 'Hadi Owner',
        locale: 'en',
        is_active: true,
      },
      update: {},
    });
    BUSINESS_OWNER_USER_ID = bizOwner.id;

    const bizOwnerRole = await tx.roles.findUnique({
      where: { key: UserRole.BusinessOwner },
    });
    if (bizOwnerRole) {
      await tx.user_role_scopes.upsert({
        where: {
          user_id_role_id_scope_type_scope_id: {
            user_id: bizOwner.id,
            role_id: bizOwnerRole.id,
            scope_type: 'company',
            scope_id: 'pending',
          },
        },
        create: {
          user_id: bizOwner.id,
          role_id: bizOwnerRole.id,
          role_key: UserRole.BusinessOwner,
          scope_type: 'company',
          scope_id: 'pending',
        },
        update: {},
      });
    }

    await tx.user_profiles.upsert({
      where: { user_id: bizOwner.id },
      create: {
        user_id: bizOwner.id,
        first_name: 'Hadi',
        last_name: 'Owner',
        country_id: lbCountry.id,
        city_id: beirutCity?.id || null,
        completed_onboarding: true,
      },
      update: {},
    });

    const bizOwnerCustomer = await tx.customers.upsert({
      where: { user_id: bizOwner.id },
      create: {
        user_id: bizOwner.id,
        total_spent_amount: 0,
        total_bookings: 0,
        loyalty_points: 0,
      },
      update: {},
    });

    await tx.customer_profiles.upsert({
      where: { customer_id: bizOwnerCustomer.id },
      create: {
        customer_id: bizOwnerCustomer.id,
      },
      update: {},
    });
    console.log('  User: Business Owner (Hadi) created');

    const customerHash = bcrypt.hashSync('Cust123!', SALT_ROUNDS);
    const customer = await tx.users.upsert({
      where: { email: 'customer@lookiva.dev' },
      create: {
        email: 'customer@lookiva.dev',
        phone: '+96170333444',
        email_verified_at: new Date(),
        phone_verified_at: new Date(),
        password_hash: customerHash,
        full_name: 'Demo Customer',
        locale: 'en',
        is_active: true,
      },
      update: {},
    });
    CUSTOMER_USER_ID = customer.id;

    const customerRole = await tx.roles.findUnique({
      where: { key: UserRole.Customer },
    });
    if (customerRole) {
      await tx.user_role_scopes.upsert({
        where: {
          user_id_role_id_scope_type_scope_id: {
            user_id: customer.id,
            role_id: customerRole.id,
            scope_type: 'platform',
            scope_id: 'platform',
          },
        },
        create: {
          user_id: customer.id,
          role_id: customerRole.id,
          role_key: UserRole.Customer,
          scope_type: 'platform',
          scope_id: 'platform',
        },
        update: {},
      });
    }

    await tx.user_profiles.upsert({
      where: { user_id: customer.id },
      create: {
        user_id: customer.id,
        first_name: 'Demo',
        last_name: 'Customer',
        country_id: lbCountry.id,
        city_id: beirutCity?.id || null,
        completed_onboarding: true,
      },
      update: {},
    });

    const customerRecord = await tx.customers.upsert({
      where: { user_id: customer.id },
      create: {
        user_id: customer.id,
        total_spent_amount: 0,
        total_bookings: 0,
        loyalty_points: 0,
      },
      update: {},
    });

    await tx.customer_profiles.upsert({
      where: { customer_id: customerRecord.id },
      create: {
        customer_id: customerRecord.id,
      },
      update: {},
    });

    await tx.customer_preferences.upsert({
      where: { customer_id: customerRecord.id },
      create: {
        customer_id: customerRecord.id,
        price_range_min: 5,
        price_range_max: 100,
        style_interests: ['Classic Cut', 'Fade', 'Beard Trim'],
      },
      update: {},
    });

    await tx.user_preferences.upsert({
      where: { user_id: customer.id },
      create: {
        user_id: customer.id,
      },
      update: {},
    });
    console.log('  User: Demo Customer created');
  });

  console.log('=== Users, Roles & Permissions Seeding Complete ===\n');
}
