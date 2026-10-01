import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@lookiva/shared-types';
import { seedGeoLebanon } from './seed/geo-lebanon';
import { seedCategories } from './seed/categories';
import { seedResourceTypes } from './seed/resource-types';
import { SALT_ROUNDS, seedUsersAndRoles } from './seed/users-and-roles';
import { seedDemoBusinesses } from './seed/demo-businesses';

const prisma = new PrismaClient({ log: ['warn', 'error'] });
type SeedMode = 'dev' | 'test' | 'prod';

function parseMode(argv: string[]): SeedMode {
  const mode = (argv.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'dev').toLowerCase();
  if (mode === 'test') return 'test';
  if (['prod', 'production'].includes(mode)) return 'prod';
  return 'dev';
}

async function bootstrapProductionAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email && !password) {
    console.log('  Production admin not bootstrapped. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for first deployment only.');
    return;
  }
  if (!email || !password) throw new Error('Both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required together');
  if (!email.includes('@')) throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address');
  if (password.length < 16) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 16 characters');
  if (/^(admin|password|lookiva|changeme)/i.test(password)) throw new Error('BOOTSTRAP_ADMIN_PASSWORD is too predictable');

  const role = await prisma.roles.findUnique({ where: { key: UserRole.SuperAdmin } });
  if (!role) throw new Error('Super Admin role is missing after role seeding');
  const existing = await prisma.users.findUnique({ where: { email } });
  const user = existing ?? await prisma.users.create({
    data: {
      email,
      email_verified_at: new Date(),
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      full_name: 'Platform Administrator',
      locale: 'en',
      is_active: true,
    },
  });
  await prisma.user_role_scopes.upsert({
    where: { user_id_role_id_scope_type_scope_id: { user_id: user.id, role_id: role.id, scope_type: 'platform', scope_id: 'platform' } },
    create: { user_id: user.id, role_id: role.id, role_key: UserRole.SuperAdmin, scope_type: 'platform', scope_id: 'platform' },
    update: {},
  });
  console.log(`  Production Super Admin ${existing ? 'already exists' : 'created'}: ${email}`);
}

async function main() {
  const mode = parseMode(process.argv);
  const includeDemoData = mode !== 'prod';
  const startAt = Date.now();

  console.log('========================================================');
  console.log(`  LOOKIVA Database Seeding - Mode: ${mode.toUpperCase()}`);
  console.log('  Started: ' + new Date(startAt).toISOString());
  console.log('========================================================\n');

  try {
    console.log('[1/5] Seeding geography reference data...');
    await seedGeoLebanon(prisma);
    console.log('[2/5] Seeding service category reference data...');
    await seedCategories(prisma);
    console.log('[3/5] Seeding resource type reference data...');
    await seedResourceTypes(prisma);
    console.log('[4/5] Seeding roles and permissions...');
    await seedUsersAndRoles(prisma, includeDemoData);

    if (includeDemoData) {
      console.log('[5/5] Seeding development/test demo businesses...');
      await seedDemoBusinesses(prisma);
    } else {
      console.log('[5/5] Demo businesses skipped for production.');
      await bootstrapProductionAdmin();
    }

    console.log('========================================================');
    console.log(`  ✅ ${mode.toUpperCase()} SEED COMPLETE`);
    console.log(`  Total time: ${((Date.now() - startAt) / 1000).toFixed(2)}s`);
    console.log('========================================================');
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:\n', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
