import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  SUPER_ADMIN_USER_ID, BUSINESS_OWNER_USER_ID, CUSTOMER_USER_ID, SALT_ROUNDS } from './users-and-roles';

export async function seedDemoBusinesses(prisma: PrismaClient) {
  console.log('\n=== Seeding Demo Businesses ===');

  await prisma.$transaction(async (tx) => {
    const lbCountry = await tx.countries.findUnique({ where: { iso_code: 'LB' } });
    if (!lbCountry) throw new Error('Lebanon country not found');

    const beirutCity = await tx.cities.findFirst({ where: { country_id: lbCountry.id, name: 'Beirut' } });
    const beirutRegion = await tx.regions.findFirst({ where: { country_id: lbCountry.id, code: 'BEI' } });
    const hamraArea = await tx.areas.findFirst({ where: { country_id: lbCountry.id, name: 'Hamra' } });
    const hazmiehArea = await tx.areas.findFirst({ where: { country_id: lbCountry.id, name: 'Hazmieh' } });
    const achrafiehArea = await tx.areas.findFirst({ where: { country_id: lbCountry.id, name: 'Achrafieh' } });
    const jouniehCity = await tx.cities.findFirst({ where: { country_id: lbCountry.id, name: 'Jounieh' } });
    const jouniehArea = await tx.areas.findFirst({ where: { country_id: lbCountry.id, name: 'Jounieh Central' } });
    const mountLebanonRegion = await tx.regions.findFirst({ where: { country_id: lbCountry.id, code: 'ML' } });

    const barbersCat = await tx.service_categories.findUnique({ where: { slug: 'barbers' } });
    const mensSalonsCat = await tx.service_categories.findUnique({ where: { slug: 'mens-salons' } });
    const womensSalonsCat = await tx.service_categories.findUnique({ where: { slug: 'womens-salons' } });
    const spasCat = await tx.service_categories.findUnique({ where: { slug: 'spas' } });
    const skincareCat = await tx.service_categories.findUnique({ where: { slug: 'skincare' } });
    if (!barbersCat || !mensSalonsCat || !womensSalonsCat || !spasCat || !skincareCat) {
      throw new Error('Required service categories not found');
    }

    const bizOwnerId = BUSINESS_OWNER_USER_ID;
    const bizOwner = await tx.users.findUnique({ where: { id: bizOwnerId } });
    if (!bizOwner) throw new Error('Business owner user not found');

    const businessOwnerRole = await tx.roles.findUnique({ where: { key: 'business_owner' } });
    const professionalRole = await tx.roles.findUnique({ where: { key: 'professional' } });
    const customerRole = await tx.roles.findUnique({ where: { key: 'customer' } });
    if (!businessOwnerRole || !professionalRole || !customerRole) {
      throw new Error('Required roles not found');
    }

    const resourceTypes: Record<string, string> = {};
    const rts = await tx.resource_types.findMany();
    for (const rt of rts) { resourceTypes[rt.code] = rt.id; }

    const createUser = async (data: { email: string; password: string; full_name: string; phone?: string }) => {
      const existing = await tx.users.findUnique({ where: { email: data.email } });
      if (existing) return existing;
      const hash = bcrypt.hashSync(data.password, SALT_ROUNDS);
      return tx.users.create({
        data: {
          email: data.email,
          phone: data.phone || null,
          email_verified_at: new Date(),
          phone_verified_at: data.phone ? new Date() : null,
          password_hash: hash,
          full_name: data.full_name,
          locale: 'en',
          is_active: true,
        },
      });
    };

    const ensureRoleScope = async (userId: string, roleId: string, roleKey: string, scopeType: string, scopeId: string = `${scopeType}-global`, companyId?: string, branchId?: string) => {
      const existing = await tx.user_role_scopes.findFirst({
        where: { user_id: userId, role_id: roleId, scope_type: scopeType },
        orderBy: { created_at: 'desc' },
      });
      if (existing) {
        return tx.user_role_scopes.update({
          where: { id: existing.id },
          data: { scope_id: scopeId, company_id: companyId, branch_id: branchId },
        });
      }
      return tx.user_role_scopes.create({
        data: {
          user_id: userId, role_id: roleId, role_key: roleKey,
          scope_type: scopeType, scope_id: scopeId,
          company_id: companyId, branch_id: branchId,
        },
      });
    };

    const ensureCustomer = async (userId: string) => {
      const existing = await tx.customers.findFirst({ where: { user_id: userId } });
      if (existing) {
        const prof = await tx.customer_profiles.findUnique({ where: { customer_id: existing.id } });
        if (!prof) { await tx.customer_profiles.create({ data: { customer_id: existing.id } }); }
        return existing;
      }
      const cust = await tx.customers.create({
        data: { user_id: userId, total_spent_amount: 0, total_bookings: 0, loyalty_points: 0 },
      });
      await tx.customer_profiles.create({ data: { customer_id: cust.id } });
      return cust;
    };

    const ensureProfessionalSchedule = async (proId: string, branchId: string, dow: number, start: string, end: string) => {
      const existing = await tx.professional_schedules.findFirst({
        where: { professional_id: proId, branch_id: branchId, day_of_week: dow },
      });
      if (existing) return existing;
      return tx.professional_schedules.create({
        data: {
          professional_id: proId, branch_id: branchId, day_of_week: dow,
          is_off: false, starts_at: start, ends_at: end,
        },
      });
    };

    const ensureResource = async (companyId: string, branchId: string, typeId: string | null | undefined, name: string, type: string, code: string, desc: string) => {
      const existing = await tx.resources.findFirst({
        where: { company_id: companyId, branch_id: branchId, name },
      });
      if (existing) return existing;
      return tx.resources.create({
        data: {
          company_id: companyId, branch_id: branchId,
          resource_type_id: typeId || null,
          name, type, code, description: desc,
          quantity: 1, is_active: true,
        },
      });
    };

    const ensureBranchHours = async (branchId: string, dow: number, data: Omit<Prisma.branch_hoursUncheckedCreateWithoutBranchInput, 'day_of_week'>) => {
      const existing = await tx.branch_hours.findUnique({
        where: { branch_id_day_of_week: { branch_id: branchId, day_of_week: dow } },
      });
      if (existing) return existing;
      return tx.branch_hours.create({
        data: { ...data, branch_id: branchId, day_of_week: dow },
      });
    };

    const hadiCompany = await tx.companies.upsert({
      where: { slug: 'hadi-barber-hamra' },
      create: {
        owner_user_id: bizOwnerId,
        country_id: lbCountry.id,
        city_id: beirutCity?.id || null,
        category_ids: [barbersCat.id, mensSalonsCat.id],
        display_name: 'Hadi Barber',
        slug: 'hadi-barber-hamra',
        description_short: 'Premium men\'s barbershop in Hamra',
        description_long: 'Hadi Barber is a premium men\'s barbershop located in the heart of Hamra, Beirut. With over a decade of experience, our expert barbers provide classic and modern haircuts, precise beard trims, and the legendary hot towel shave experience. We blend traditional Lebanese barbering craftsmanship with contemporary style trends to deliver an unmatched grooming experience in a relaxed, welcoming atmosphere.',
        tagline: 'Where Style Meets Tradition',
        avg_rating: 4.9,
        review_count: 10,
        follower_count: 150,
        view_count: 2500,
        is_verified: true,
        verified_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        booking_enabled: true,
        walk_ins_enabled: true,
        online_payments_enabled: false,
        auto_confirm_bookings: true,
        deposit_required: false,
      },
      update: {},
    });

    await tx.company_settings.upsert({
      where: { company_id: hadiCompany.id },
      create: {
        company_id: hadiCompany.id,
        facilities: ['wifi', 'air_conditioning', 'credit_card', 'parking_nearby'],
        languages_spoken: ['en', 'ar'],
        accepted_payments: ['cash', 'card', 'visa', 'mastercard'],
        parking_options: ['street'],
        home_service_enabled: false,
      },
      update: {},
    });

    if (businessOwnerRole) {
      await ensureRoleScope(bizOwnerId, businessOwnerRole.id, 'business_owner', 'company', hadiCompany.id, hadiCompany.id);
    }

    const hadiBranch = await tx.branches.upsert({
      where: { company_id_slug: { company_id: hadiCompany.id, slug: 'hazmieh-main' } },
      create: {
        company_id: hadiCompany.id,
        name: 'Hazmieh Main',
        slug: 'hazmieh-main',
        country_id: lbCountry.id,
        city_id: beirutCity?.id || null,
        area_id: hazmiehArea?.id || null,
        region_id: mountLebanonRegion?.id || beirutRegion?.id || null,
        address_line_1: 'Hazmieh Main Street',
        latitude: 33.8600,
        longitude: 35.5750,
        phone: '+9611345678',
        whatsapp: '+96170123456',
        is_main: true,
        is_active: true,
        timezone: 'Asia/Beirut',
        booking_enabled: true,
        walk_ins_enabled: true,
        home_service_enabled: false,
      },
      update: {
        name: 'Hazmieh Main',
        slug: 'hazmieh-main',
        area_id: hazmiehArea?.id || null,
        region_id: mountLebanonRegion?.id || beirutRegion?.id || null,
        address_line_1: 'Hazmieh Main Street',
        latitude: 33.8600,
        longitude: 35.5750,
      },
    });

    const hadiLocExist = await tx.branch_locations.findUnique({ where: { branch_id: hadiBranch.id } });
    if (!hadiLocExist) {
      await tx.branch_locations.create({
        data: { branch_id: hadiBranch.id, address: 'Hazmieh Main Street' },
      });
    } else {
      await tx.branch_locations.update({
        where: { branch_id: hadiBranch.id },
        data: { address: 'Hazmieh Main Street' },
      });
    }
    await tx.$executeRawUnsafe(
      `UPDATE branch_locations SET point = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE branch_id = $3`,
      35.5750, 33.8600, hadiBranch.id
    );

    for (let dow = 1; dow <= 6; dow++) {
      await ensureBranchHours(hadiBranch.id, dow, {
        is_closed: false, opens_at: '09:00', closes_at: '21:00', slot_size_minutes: 15,
      });
    }
    await ensureBranchHours(hadiBranch.id, 0, { is_closed: true, slot_size_minutes: 15 });

    const aliUser = await createUser({
      email: 'ali@hadibarber.lb', password: 'Ali123!', full_name: 'Ali Stylist', phone: '+96170222333',
    });
    await ensureRoleScope(aliUser.id, professionalRole.id, 'professional', 'company', hadiCompany.id, hadiCompany.id, hadiBranch.id);
    const aliProfExist = await tx.user_profiles.findUnique({ where: { user_id: aliUser.id } });
    if (!aliProfExist) {
      await tx.user_profiles.create({
        data: { user_id: aliUser.id, first_name: 'Ali', last_name: 'Stylist', country_id: lbCountry.id, city_id: beirutCity?.id || null, completed_onboarding: true },
      });
    }

    const existing_hadiPro = await tx.professionals.findFirst({
      where: {
        user_id: bizOwnerId,
        company_id: hadiCompany.id,
      },
    });

    const hadiPro =
      existing_hadiPro ??
      (await tx.professionals.create({
        data: {
        user_id: bizOwnerId,
        company_id: hadiCompany.id,
        branch_ids: [hadiBranch.id],
        display_name: 'Hadi - Master Barber',
        specialties: ['Fade', 'Beard Trim', 'Classic Cut', 'Hot Towel Shave'],
        years_experience: 12,
        gender_preference: 'male',
        avg_rating: 4.9,
        review_count: 8,
        follower_count: 95,
        is_verified: true,
        verified_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        accepts_walk_ins: true,
        },
      }));

    const hadiProfProf = await tx.professional_profiles.findUnique({ where: { professional_id: hadiPro.id } });
    if (!hadiProfProf) {
      await tx.professional_profiles.create({
        data: {
          professional_id: hadiPro.id, user_id: bizOwnerId,
          education: ['LB Barber College 2012'],
          certifications: ['Master Barber License'],
          languages_spoken: ['en', 'ar'],
        },
      });
    }
    await tx.professional_branches.upsert({
      where: { professional_id_branch_id: { professional_id: hadiPro.id, branch_id: hadiBranch.id } },
      create: { professional_id: hadiPro.id, branch_id: hadiBranch.id, is_primary: true },
      update: {},
    });
    for (let dow = 1; dow <= 6; dow++) {
      await ensureProfessionalSchedule(hadiPro.id, hadiBranch.id, dow, '09:00', '21:00');
    }

    const existing_aliPro = await tx.professionals.findFirst({
      where: {
        user_id: aliUser.id,
        company_id: hadiCompany.id,
      },
    });

    const aliPro =
      existing_aliPro ??
      (await tx.professionals.create({
        data: {
        user_id: aliUser.id,
        company_id: hadiCompany.id,
        branch_ids: [hadiBranch.id],
        display_name: 'Ali - Senior Stylist',
        specialties: ['Haircut', 'Fade', 'Hair Styling'],
        years_experience: 8,
        avg_rating: 4.7,
        review_count: 2,
        follower_count: 45,
        is_active: true,
        accepts_walk_ins: true,
        },
      }));
    const aliProProf = await tx.professional_profiles.findUnique({ where: { professional_id: aliPro.id } });
    if (!aliProProf) {
      await tx.professional_profiles.create({
        data: {
          professional_id: aliPro.id, user_id: aliUser.id,
          education: ['Beirut Hair Academy 2016'],
          certifications: ['Senior Stylist Certification'],
          languages_spoken: ['en', 'ar', 'fr'],
        },
      });
    }
    await tx.professional_branches.upsert({
      where: { professional_id_branch_id: { professional_id: aliPro.id, branch_id: hadiBranch.id } },
      create: { professional_id: aliPro.id, branch_id: hadiBranch.id, is_primary: true },
      update: {},
    });
    for (let dow = 1; dow <= 6; dow++) {
      await ensureProfessionalSchedule(aliPro.id, hadiBranch.id, dow, '09:00', '21:00');
    }

    const serviceDefs = [
      { slug: 'classic-haircut', name: 'Classic Haircut', ar: 'Ù‚ØµØ© ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ©', fr: 'Coupe Classique', summary: 'Timeless haircut with wash and style', ar_summary: 'Ù‚ØµØ© Ø´Ø¹Ø± Ø®Ø§Ù„Ø¯Ø© Ù…Ø¹ ØºØ³ÙŠÙ„ ÙˆØªØµÙÙŠÙ', fr_summary: 'Coupe intemporelle avec lavage et coiffage', duration: 30, price: 10, featured: true },
      { slug: 'premium-fade', name: 'Premium Fade', ar: 'ÙÙŠØ¯ Ù…Ù…ÙŠØ²', fr: 'DÃ©gradÃ© Premium', summary: 'Expert fade haircut with skin fade techniques', ar_summary: 'Ù‚ØµØ© ÙÙŠØ¯ Ø®Ø¨ÙŠØ±Ø© Ø¨ØªÙ‚Ù†ÙŠØ§Øª ÙÙŠØ¯ Ø§Ù„Ø¬Ù„Ø¯', fr_summary: 'Coupe dÃ©gradÃ© experte avec techniques', duration: 45, price: 15, featured: true },
      { slug: 'beard-trim-shape', name: 'Beard Trim & Shape', ar: 'ØªÙ‚Ù„ÙŠÙ… ÙˆØªØ´ÙƒÙŠÙ„ Ø§Ù„Ù„Ø­ÙŠØ©', fr: 'Taille et Forme de Barbe', summary: 'Precision beard trim, edge up and styling', ar_summary: 'ØªØ­Ø¯ÙŠØ¯ Ø¯Ù‚ÙŠÙ‚ Ù„Ù„Ø­ÙŠØ© ÙˆØ­Ø¯ÙˆØ¯ ÙˆØªØµÙÙŠÙ', fr_summary: 'Taille de barbe de prÃ©cision', duration: 20, price: 8, featured: true },
      { slug: 'hot-towel-shave', name: 'Hot Towel Shave', ar: 'Ø­Ù„Ø§Ù‚Ø© Ø¨Ø§Ù„Ù…Ù†Ø´ÙØ© Ø§Ù„Ø³Ø§Ø®Ù†Ø©', fr: 'Rasage Serviette Chaude', summary: 'Traditional straight razor shave with hot towels', ar_summary: 'Ø­Ù„Ø§Ù‚Ø© ØªÙ‚Ù„ÙŠØ¯ÙŠØ© Ø¨Ø´ÙØ±Ø© Ù…Ø³ØªÙ‚ÙŠÙ…Ø© Ø¨Ù…Ù†Ø§Ø´Ù Ø³Ø§Ø®Ù†Ø©', fr_summary: 'Rasage traditionnel au rasoir droit', duration: 45, price: 20, featured: false },
      { slug: 'haircut-beard-combo', name: 'Haircut + Beard Combo', ar: 'Ø¨Ø§Ù‚Ø© Ù‚ØµØ© ÙˆÙ„Ø­ÙŠØ©', fr: 'Combo Coupe + Barbe', summary: 'Full haircut combined with beard service', ar_summary: 'Ù‚ØµØ© Ø´Ø¹Ø± ÙƒØ§Ù…Ù„Ø© Ù…Ø¹ Ø®Ø¯Ù…Ø© Ø§Ù„Ù„Ø­ÙŠØ©', fr_summary: 'Coupe complÃ¨te avec service barbe', duration: 50, price: 16, featured: false },
      { slug: 'kids-haircut', name: 'Kids Haircut', ar: 'Ù‚ØµØ© Ø£Ø·ÙØ§Ù„', fr: 'Coupe Enfants', summary: 'Gentle haircut for children under 12', ar_summary: 'Ù‚ØµØ© Ù„Ø·ÙŠÙØ© Ù„Ù„Ø£Ø·ÙØ§Ù„ ØªØ­Øª 12 Ø³Ù†Ø©', fr_summary: 'Coupe douce pour enfants', duration: 20, price: 7, featured: false },
      { slug: 'hair-wash-style', name: 'Hair Wash & Style', ar: 'ØºØ³ÙŠÙ„ ÙˆØªØµÙÙŠÙ Ø§Ù„Ø´Ø¹Ø±', fr: 'Lavage et Coiffage', summary: 'Professional wash, condition and blow dry style', ar_summary: 'ØºØ³ÙŠÙ„ ÙˆØªÙƒÙŠÙŠÙ ÙˆØªØ¬ÙÙŠÙ Ø§Ø­ØªØ±Ø§ÙÙŠ', fr_summary: 'Lavage, soin et brushing', duration: 25, price: 12, featured: false },
      { slug: 'vip-mens-package', name: 'VIP Men\'s Package', ar: 'Ø¨Ø§Ù‚Ø© Ø§Ù„Ø±Ø¬Ø§Ù„ Ø§Ù„Ù…Ù…ÙŠØ²Ø©', fr: 'Forfait VIP Homme', summary: 'Haircut, beard, hot towel, face scrub & massage', ar_summary: 'Ù‚ØµØ© ÙˆÙ„Ø­ÙŠØ© ÙˆÙ…Ù†Ø´ÙØ© Ø³Ø§Ø®Ù†Ø© ÙˆÙØ±Ùƒ ÙˆØ¹Ù„Ø§Ø¬', fr_summary: 'Coupe, barbe, serviette chaude, gommage', duration: 90, price: 35, featured: false },
    ];

    const hadiServices: string[] = [];
    for (const svc of serviceDefs) {
      const service = await tx.services.upsert({
        where: { company_id_slug: { company_id: hadiCompany.id, slug: svc.slug } },
        create: {
          company_id: hadiCompany.id,
          category_id: barbersCat.id,
          branch_ids: [hadiBranch.id],
          professional_ids: [hadiPro.id, aliPro.id],
          slug: svc.slug,
          name: svc.name,
          summary: svc.summary,
          description: svc.summary,
          duration_minutes: svc.duration,
          base_price: svc.price,
          currency_code: 'USD',
          tax_inclusive: true,
          is_active: true,
          is_featured: svc.featured,
          walk_ins_allowed: true,
          home_service_allowed: false,
          online_payment_required: false,
          max_clients_per_slot: 1,
        },
        update: {},
      });
      hadiServices.push(service.id);

      const locales: Array<{ l: string; n: string; s: string }> = [
        { l: 'en', n: svc.name, s: svc.summary },
        { l: 'ar', n: svc.ar, s: svc.ar_summary },
        { l: 'fr', n: svc.fr, s: svc.fr_summary },
      ];
      for (const loc of locales) {
        const trExist = await tx.service_translations.findUnique({ where: { service_id_locale: { service_id: service.id, locale: loc.l } } });
        if (!trExist) {
          await tx.service_translations.create({
            data: { service_id: service.id, locale: loc.l, name: loc.n, summary: loc.s, description: loc.s },
          });
        }
      }

      const sbsExist = await tx.service_branch_settings.findUnique({
        where: { service_id_branch_id: { service_id: service.id, branch_id: hadiBranch.id } },
      });
      if (!sbsExist) {
        await tx.service_branch_settings.create({
          data: { service_id: service.id, branch_id: hadiBranch.id, is_enabled: true },
        });
      }
    }
    console.log('  Hadi Barber services created');

    const hadiChair1 = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['BARBER_CHAIR'], 'Chair 1', 'chair', 'HB-C01', 'Premium barber chair - main station');
    const hadiChair2 = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['BARBER_CHAIR'], 'Chair 2', 'chair', 'HB-C02', 'Barber chair - second station');
    const hadiChair3 = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['BARBER_CHAIR'], 'Chair 3', 'chair', 'HB-C03', 'Barber chair - third station');
    const hadiChair4 = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['BARBER_CHAIR'], 'Chair 4', 'chair', 'HB-C04', 'Barber chair - fourth station');
    const hadiWash1 = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['WASHING_STATION'], 'Wash Station 1', 'equipment', 'HB-W01', 'Hair washing station with reclining chair');
    const hadiWash2 = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['WASHING_STATION'], 'Wash Station 2', 'equipment', 'HB-W02', 'Hair washing station with reclining chair');
    const hadiVip = await ensureResource(hadiCompany.id, hadiBranch.id, resourceTypes['VIP_ROOM'], 'VIP Room', 'room', 'HB-VIP', 'Private VIP grooming room with premium amenities');

    await tx.professional_resources.upsert({
      where: { professional_id_resource_id: { professional_id: hadiPro.id, resource_id: hadiChair1.id } },
      create: { professional_id: hadiPro.id, resource_id: hadiChair1.id, is_default: true, priority: 1 },
      update: {},
    });
    await tx.professional_resources.upsert({
      where: { professional_id_resource_id: { professional_id: aliPro.id, resource_id: hadiChair2.id } },
      create: { professional_id: aliPro.id, resource_id: hadiChair2.id, is_default: true, priority: 1 },
      update: {},
    });
    console.log('  Hadi Barber resources created');

    const reviewCustomerData = [
      { email: 'c1@test.lb', password: 'Test123!', full_name: 'Karim C1', phone: '+96170000001' },
      { email: 'c2@test.lb', password: 'Test123!', full_name: 'Sara C2', phone: '+96170000002' },
      { email: 'c3@test.lb', password: 'Test123!', full_name: 'Jad C3', phone: '+96170000003' },
      { email: 'c4@test.lb', password: 'Test123!', full_name: 'Lama C4', phone: '+96170000004' },
      { email: 'c5@test.lb', password: 'Test123!', full_name: 'Rami C5', phone: '+96170000005' },
      { email: 'c6@test.lb', password: 'Test123!', full_name: 'Nour C6', phone: '+96170000006' },
      { email: 'c7@test.lb', password: 'Test123!', full_name: 'Tarek C7', phone: '+96170000007' },
    ];

    const reviewCustomerUsers: string[] = [CUSTOMER_USER_ID];
    for (const rc of reviewCustomerData) {
      const user = await createUser(rc);
      await ensureRoleScope(user.id, customerRole.id, 'customer', 'platform', 'platform');
      await ensureCustomer(user.id);
      reviewCustomerUsers.push(user.id);
    }

    const reviewTexts = [
      { text: 'Absolutely amazing experience! Hadi gave me the best fade I\'ve ever had. The hot towel shave was perfect.', overall: 5, quality: 5, cleanliness: 5, professionalism: 5, punctuality: 5, value: 4, service: 5 },
      { text: 'Classic cuts, great vibe. Been coming here for 2 years and never disappointed.', overall: 5, quality: 5, cleanliness: 4, professionalism: 5, punctuality: 5, value: 5, service: 5 },
      { text: 'Ali did a phenomenal job on my beard trim. Very precise and clean.', overall: 4, quality: 5, cleanliness: 5, professionalism: 4, punctuality: 5, value: 4, service: 5 },
      { text: 'Best barbershop in Hamra area. Professional staff and clean environment.', overall: 5, quality: 5, cleanliness: 5, professionalism: 5, punctuality: 4, value: 5, service: 5 },
      { text: 'VIP package is totally worth it. Relaxing, thorough, and the massage at the end is a nice touch.', overall: 5, quality: 5, cleanliness: 5, professionalism: 5, punctuality: 5, value: 4, service: 5 },
      { text: 'Kids haircut was done with a lot of patience with my son. Thank you!', overall: 5, quality: 4, cleanliness: 5, professionalism: 5, punctuality: 4, value: 5, service: 5 },
      { text: 'Great service and fair prices. Hadi really knows how to handle curly hair.', overall: 4, quality: 5, cleanliness: 4, professionalism: 5, punctuality: 4, value: 5, service: 4 },
      { text: 'My first time and I\'m definitely coming back. The hot towel experience is a must-try.', overall: 5, quality: 5, cleanliness: 5, professionalism: 5, punctuality: 5, value: 5, service: 5 },
      { text: 'Haircut and beard combo was excellent. Saved time and money.', overall: 5, quality: 5, cleanliness: 5, professionalism: 4, punctuality: 5, value: 5, service: 5 },
      { text: 'Fade from Ali is top tier. Clean lines and blended perfectly.', overall: 5, quality: 5, cleanliness: 5, professionalism: 5, punctuality: 4, value: 4, service: 5 },
    ];

    const existingHadiReviews = await tx.reviews.count({ where: { company_id: hadiCompany.id } });
    if (existingHadiReviews === 0) {
      for (let i = 0; i < reviewTexts.length; i++) {
        const rt = reviewTexts[i];
        const userId = reviewCustomerUsers[i % reviewCustomerUsers.length];
        const pro = i % 2 === 0 ? hadiPro : aliPro;
        const svcId = hadiServices[i % hadiServices.length];

        const review = await tx.reviews.create({
          data: {
            author_user_id: userId,
            company_id: hadiCompany.id,
            branch_id: hadiBranch.id,
            service_id: svcId,
            professional_id: pro.id,
            body: rt.text,
            overall_rating: rt.overall,
            is_verified: true,
            status: 'published',
            published_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
          },
        });

        const dims = [
          { d: 'quality', r: rt.quality },
          { d: 'cleanliness', r: rt.cleanliness },
          { d: 'professionalism', r: rt.professionalism },
          { d: 'punctuality', r: rt.punctuality },
          { d: 'value', r: rt.value },
          { d: 'service', r: rt.service },
        ];
        for (const dim of dims) {
          try {
            await tx.review_ratings.create({
              data: { review_id: review.id, dimension: dim.d, rating: dim.r },
            });
          } catch (e) { /* ignore duplicates */ }
        }
      }
    }
    console.log('  Hadi Barber reviews created');

    const existingHadiPosts = await tx.posts.count({ where: { company_id: hadiCompany.id } });
    if (existingHadiPosts === 0) {
      for (let i = 0; i < 8; i++) {
        const isCover = i === 0;
        try {
          await tx.posts.create({
            data: {
              author_user_id: bizOwnerId,
              author_role: 'business_owner',
              company_id: hadiCompany.id,
              branch_id: hadiBranch.id,
              professional_id: i < 4 ? hadiPro.id : aliPro.id,
              title: isCover ? 'Our Shop Interior' : `Portfolio Look ${i}`,
              body_plain: isCover ? 'Welcome to Hadi Barber - your premier barbershop experience in Hamra, Beirut.' : `Fresh cuts, sharp lines, and professional service. Book your appointment today!`,
              is_promotion: false,
              status: 'published',
              published_at: new Date(Date.now() - (i + 5) * 24 * 60 * 60 * 1000),
              view_count: 50 + i * 30,
              like_count: 10 + i * 5,
            },
          });
        } catch (e) { /* ignore */ }
      }
    }
    console.log('  Hadi Barber posts created');
    console.log('  Hadi Barber: COMPLETE');

    const sarahOwner = await createUser({
      email: 'sarah_owner@lookiva.dev', password: 'Sarah123!', full_name: 'Sarah Beauty', phone: '+96170444555',
    });
    await ensureRoleScope(sarahOwner.id, businessOwnerRole.id, 'business_owner', 'company', 'sarah-pending');
    const sarahOwnerProf = await tx.user_profiles.findUnique({ where: { user_id: sarahOwner.id } });
    if (!sarahOwnerProf) {
      await tx.user_profiles.create({
        data: { user_id: sarahOwner.id, first_name: 'Sarah', last_name: 'Beauty', country_id: lbCountry.id, city_id: beirutCity?.id || null, completed_onboarding: true },
      });
    }
    await ensureCustomer(sarahOwner.id);

    const sarahCompany = await tx.companies.upsert({
      where: { slug: 'sarah-beauty-achrafieh' },
      create: {
        owner_user_id: sarahOwner.id,
        country_id: lbCountry.id,
        city_id: beirutCity?.id || null,
        category_ids: [womensSalonsCat.id],
        display_name: 'Sarah Beauty Salon',
        slug: 'sarah-beauty-achrafieh',
        description_short: 'Premium women\'s beauty salon in Achrafieh',
        description_long: 'Sarah Beauty Salon is a premium women\'s beauty center located in vibrant Achrafieh. We offer a comprehensive range of beauty services including manicure, pedicure, hair coloring, highlights, blow dry, keratin treatments, facials, and professional makeup artistry. Our experienced team of stylists and therapists is dedicated to helping you look and feel your absolute best.',
        tagline: 'Where Beauty Blooms',
        avg_rating: 4.6,
        review_count: 5,
        follower_count: 200,
        view_count: 3200,
        is_verified: true,
        verified_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        published_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        is_active: true,
        booking_enabled: true,
        walk_ins_enabled: true,
        online_payments_enabled: false,
        auto_confirm_bookings: true,
        deposit_required: false,
      },
      update: {},
    });

    await tx.company_settings.upsert({
      where: { company_id: sarahCompany.id },
      create: {
        company_id: sarahCompany.id,
        facilities: ['wifi', 'air_conditioning', 'credit_card', 'parking_nearby'],
        languages_spoken: ['en', 'ar', 'fr'],
        accepted_payments: ['cash', 'card', 'visa', 'mastercard'],
        parking_options: ['street', 'valet'],
        home_service_enabled: false,
      },
      update: {},
    });
    await ensureRoleScope(sarahOwner.id, businessOwnerRole.id, 'business_owner', 'company', sarahCompany.id, sarahCompany.id);

    const sarahBranch = await tx.branches.upsert({
      where: { company_id_slug: { company_id: sarahCompany.id, slug: 'achrafieh-main' } },
      create: {
        company_id: sarahCompany.id,
        name: 'Achrafieh Main',
        slug: 'achrafieh-main',
        country_id: lbCountry.id,
        city_id: beirutCity?.id || null,
        area_id: achrafiehArea?.id || null,
        region_id: beirutRegion?.id || null,
        address_line_1: 'Achrafieh, Sodeco Street',
        latitude: 33.8867,
        longitude: 35.5083,
        phone: '+9611234567',
        whatsapp: '+96170555666',
        is_main: true,
        is_active: true,
        timezone: 'Asia/Beirut',
        booking_enabled: true,
        walk_ins_enabled: true,
        home_service_enabled: false,
      },
      update: {},
    });

    const sarahLocExist = await tx.branch_locations.findUnique({ where: { branch_id: sarahBranch.id } });
    if (!sarahLocExist) {
      await tx.branch_locations.create({ data: { branch_id: sarahBranch.id, address: 'Achrafieh, Sodeco Street' } });
    }
    await tx.$executeRawUnsafe(
      `UPDATE branch_locations SET point = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE branch_id = $3`,
      35.5083, 33.8867, sarahBranch.id
    );
    for (let dow = 1; dow <= 6; dow++) {
      await ensureBranchHours(sarahBranch.id, dow, { is_closed: false, opens_at: '10:00', closes_at: '20:00', slot_size_minutes: 15 });
    }
    await ensureBranchHours(sarahBranch.id, 0, { is_closed: true, slot_size_minutes: 15 });

    const miraUser = await createUser({
      email: 'mira@sarahbeauty.lb', password: 'Mira123!', full_name: 'Mira Stylist', phone: '+96170666777',
    });
    await ensureRoleScope(miraUser.id, professionalRole.id, 'professional', 'company', sarahCompany.id, sarahCompany.id, sarahBranch.id);
    const miraProfExist = await tx.user_profiles.findUnique({ where: { user_id: miraUser.id } });
    if (!miraProfExist) {
      await tx.user_profiles.create({
        data: { user_id: miraUser.id, first_name: 'Mira', last_name: 'Stylist', country_id: lbCountry.id, city_id: beirutCity?.id || null, completed_onboarding: true },
      });
    }

    const existing_sarahPro = await tx.professionals.findFirst({
      where: {
        user_id: sarahOwner.id,
        company_id: sarahCompany.id,
      },
    });

    const sarahPro =
      existing_sarahPro ??
      (await tx.professionals.create({
        data: {
        user_id: sarahOwner.id, company_id: sarahCompany.id, branch_ids: [sarahBranch.id],
        display_name: 'Sarah - Senior Stylist & Owner',
        specialties: ['Hair Coloring', 'Highlights', 'Keratin Treatment', 'Bridal Hair'],
        years_experience: 10, gender_preference: 'female',
        avg_rating: 4.7, review_count: 3, follower_count: 120,
        is_verified: true, verified_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        is_active: true, accepts_walk_ins: true,
        },
      }));
    const sarahProProf = await tx.professional_profiles.findUnique({ where: { professional_id: sarahPro.id } });
    if (!sarahProProf) {
      await tx.professional_profiles.create({
        data: {
          professional_id: sarahPro.id, user_id: sarahOwner.id,
          education: ['Lebanese Academy of Beauty 2014'],
          certifications: ['Senior Hair Color Specialist'],
          languages_spoken: ['en', 'ar', 'fr'],
        },
      });
    }
    await tx.professional_branches.upsert({
      where: { professional_id_branch_id: { professional_id: sarahPro.id, branch_id: sarahBranch.id } },
      create: { professional_id: sarahPro.id, branch_id: sarahBranch.id, is_primary: true },
      update: {},
    });
    for (let dow = 1; dow <= 6; dow++) {
      await ensureProfessionalSchedule(sarahPro.id, sarahBranch.id, dow, '10:00', '20:00');
    }

    const existing_miraPro = await tx.professionals.findFirst({
      where: {
        user_id: miraUser.id,
        company_id: sarahCompany.id,
      },
    });

    const miraPro =
      existing_miraPro ??
      (await tx.professionals.create({
        data: {
        user_id: miraUser.id, company_id: sarahCompany.id, branch_ids: [sarahBranch.id],
        display_name: 'Mira - Nail & Makeup Artist',
        specialties: ['Manicure', 'Pedicure', 'Nail Art', 'Makeup'],
        years_experience: 6, gender_preference: 'female',
        avg_rating: 4.5, review_count: 2, follower_count: 80,
        is_active: true, accepts_walk_ins: true,
        },
      }));
    const miraProProf = await tx.professional_profiles.findUnique({ where: { professional_id: miraPro.id } });
    if (!miraProProf) {
      await tx.professional_profiles.create({
        data: {
          professional_id: miraPro.id, user_id: miraUser.id,
          education: ['Beirut Nail Institute 2018'],
          certifications: ['Certified Nail Technician', 'Makeup Artist Diploma'],
          languages_spoken: ['en', 'ar'],
        },
      });
    }
    await tx.professional_branches.upsert({
      where: { professional_id_branch_id: { professional_id: miraPro.id, branch_id: sarahBranch.id } },
      create: { professional_id: miraPro.id, branch_id: sarahBranch.id, is_primary: true },
      update: {},
    });
    for (let dow = 1; dow <= 6; dow++) {
      await ensureProfessionalSchedule(miraPro.id, sarahBranch.id, dow, '10:00', '20:00');
    }

    const sarahServiceDefs = [
      { slug: 'classic-manicure', name: 'Classic Manicure', ar: 'Ù…Ø§Ù†ÙŠÙƒÙŠØ± ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ', fr: 'Manucure Classique', summary: 'File, shape, polish, cuticle care', ar_summary: 'Ø¨Ø±Ø¯ ÙˆØªØ´ÙƒÙŠÙ„ ÙˆØªÙ„Ù…ÙŠØ¹ ÙˆØ¹Ù†Ø§ÙŠØ© Ø§Ù„Ø¨Ø´Ø±Ø©', fr_summary: 'Lime, forme, vernis, soin cuticules', duration: 30, price: 12 },
      { slug: 'gel-manicure', name: 'Gel Manicure', ar: 'Ù…Ø§Ù†ÙŠÙƒÙŠØ± Ø¬Ù„', fr: 'Manucure Gel', summary: 'Long-lasting gel polish application', ar_summary: 'Ø·Ù„Ø§Ø¡ Ø¬Ù„ ØªØ¯ÙˆÙ… Ø·ÙˆÙŠÙ„Ø§Ù‹', fr_summary: 'Application vernis gel longue durÃ©e', duration: 45, price: 22 },
      { slug: 'spa-pedicure', name: 'Spa Pedicure', ar: 'Ø¨Ø§Ø¯ÙŠÙƒÙŠØ± Ø³Ø¨Ø§', fr: 'PÃ©dicure Spa', summary: 'Foot soak, scrub, massage, polish', ar_summary: 'Ù†Ù‚Ø¹ Ø§Ù„Ù‚Ø¯Ù… ÙˆÙØ±Ùƒ ÙˆØªØ¯Ù„ÙŠÙƒ ÙˆØªÙ„Ù…ÙŠØ¹', fr_summary: 'Bain pieds, gommage, massage, vernis', duration: 60, price: 30 },
      { slug: 'hair-coloring', name: 'Hair Coloring', ar: 'ØªÙ„ÙˆÙŠÙ† Ø§Ù„Ø´Ø¹Ø±', fr: 'Coloration Cheveux', summary: 'Full head hair coloring service', ar_summary: 'Ø®Ø¯Ù…Ø© ØªÙ„ÙˆÙŠÙ† Ø§Ù„Ø´Ø¹Ø± ÙƒØ§Ù…Ù„Ø§Ù‹', fr_summary: 'Service de coloration complÃ¨te', duration: 90, price: 55 },
      { slug: 'highlights', name: 'Highlights', ar: 'Ø®ØµÙ„Ø§Øª', fr: 'MÃ¨ches', summary: 'Partial or full highlights service', ar_summary: 'Ø®Ø¯Ù…Ø© Ø®ØµÙ„Ø§Øª Ø¬Ø²Ø¦ÙŠØ© Ø£Ùˆ ÙƒØ§Ù…Ù„Ø©', fr_summary: 'Service de mÃ¨ches partielles ou complÃ¨tes', duration: 120, price: 70 },
      { slug: 'blow-dry', name: 'Blow Dry & Style', ar: 'Ø³Ø´ÙˆØ§Ø± ÙˆØªØµÙÙŠÙ', fr: 'Brushing', summary: 'Wash, blow dry and professional styling', ar_summary: 'ØºØ³ÙŠÙ„ ÙˆØ³Ø´ÙˆØ§Ø± ÙˆØªØµÙÙŠÙ Ø§Ø­ØªØ±Ø§ÙÙŠ', fr_summary: 'Lavage, brushing et coiffage pro', duration: 45, price: 20 },
      { slug: 'keratin-treatment', name: 'Keratin Treatment', ar: 'Ø¹Ù„Ø§Ø¬ Ø§Ù„ÙƒÙŠØ±Ø§ØªÙŠÙ†', fr: 'Traitement KÃ©ratine', summary: 'Smoothing keratin hair treatment', ar_summary: 'Ø¹Ù„Ø§Ø¬ Ø§Ù„Ø´Ø¹Ø± Ø¨Ø§Ù„ÙƒÙŠØ±Ø§ØªÙŠÙ† Ù„Ù„Ù†Ø¹ÙˆÙ…Ø©', fr_summary: 'Traitement lissant Ã  la kÃ©ratine', duration: 150, price: 120 },
      { slug: 'basic-facial', name: 'Basic Facial', ar: 'Ù‚Ø¶Ø§Ø¡ Ø£Ø³Ø§Ø³ÙŠ', fr: 'Soin Visage Basique', summary: 'Cleanse, exfoliate, mask and moisturize', ar_summary: 'ØªÙ†Ø¸ÙŠÙ ÙˆØªÙ‚Ø´ÙŠØ± ÙˆÙ‚Ù†Ø§Ø¹ ÙˆØªØ±Ø·ÙŠØ¨', fr_summary: 'Nettoyage, exfoliation, masque, hydratation', duration: 45, price: 35 },
      { slug: 'deep-cleansing-facial', name: 'Deep Cleansing Facial', ar: 'ØªÙ†Ø¸ÙŠÙ Ø¹Ù…ÙŠÙ‚ Ù„Ù„ÙˆØ¬Ù‡', fr: 'Soin Visage Nettoyage Profond', summary: 'Deep pore cleansing with extraction', ar_summary: 'ØªÙ†Ø¸ÙŠÙ Ø¹Ù…ÙŠÙ‚ Ù„Ù„Ù…Ø³Ø§Ù… Ù…Ø¹ Ø§Ø³ØªØ®Ù„Ø§Øµ', fr_summary: 'Nettoyage profond des pores', duration: 60, price: 50 },
      { slug: 'everyday-makeup', name: 'Everyday Makeup', ar: 'Ù…ÙƒÙŠØ§Ø¬ ÙŠÙˆÙ…ÙŠ', fr: 'Maquillage Quotidien', summary: 'Natural everyday makeup look', ar_summary: 'Ù…Ø¸Ù‡Ø± Ù…ÙƒÙŠØ§Ø¬ ÙŠÙˆÙ…ÙŠ Ø·Ø¨ÙŠØ¹ÙŠ', fr_summary: 'Look maquillage quotidien naturel', duration: 45, price: 30 },
      { slug: 'event-makeup', name: 'Event Makeup', ar: 'Ù…ÙƒÙŠØ§Ø¬ Ù…Ù†Ø§Ø³Ø¨Ø§Øª', fr: 'Maquillage Ã‰vÃ©nement', summary: 'Glam makeup for special events', ar_summary: 'Ù…ÙƒÙŠØ§Ø¬ Ø¨Ø±ÙŠÙ‚ Ù„Ù„Ù…Ù†Ø§Ø³Ø¨Ø§Øª Ø§Ù„Ø®Ø§ØµØ©', fr_summary: 'Maquillage glamour Ã©vÃ©nements', duration: 60, price: 55 },
      { slug: 'bridal-makeup', name: 'Bridal Makeup & Hair', ar: 'Ù…ÙƒÙŠØ§Ø¬ ÙˆØ´Ø¹Ø± Ø§Ù„Ø¹Ø±ÙˆØ³Ø©', fr: 'Maquillage et Coiffure MariÃ©e', summary: 'Complete bridal beauty package', ar_summary: 'Ø¨Ø§Ù‚Ø© ØªØ¬Ù…ÙŠÙ„ Ø¹Ø±ÙˆØ³Ø© ÙƒØ§Ù…Ù„Ø©', fr_summary: 'Forfait beautÃ© mariÃ©e complet', duration: 180, price: 200 },
    ];

    const sarahServices: string[] = [];
    for (const svc of sarahServiceDefs) {
      const service = await tx.services.upsert({
        where: { company_id_slug: { company_id: sarahCompany.id, slug: svc.slug } },
        create: {
          company_id: sarahCompany.id,
          category_id: womensSalonsCat.id,
          branch_ids: [sarahBranch.id],
          professional_ids: [sarahPro.id, miraPro.id],
          slug: svc.slug, name: svc.name, summary: svc.summary, description: svc.summary,
          duration_minutes: svc.duration, base_price: svc.price, currency_code: 'USD',
          tax_inclusive: true, is_active: true,
          is_featured: svc.slug === 'hair-coloring' || svc.slug === 'bridal-makeup' || svc.slug === 'keratin-treatment',
          walk_ins_allowed: true, home_service_allowed: false, online_payment_required: false, max_clients_per_slot: 1,
        },
        update: {},
      });
      sarahServices.push(service.id);

      const locs: Array<{ l: string; n: string; s: string }> = [
        { l: 'en', n: svc.name, s: svc.summary },
        { l: 'ar', n: svc.ar, s: svc.ar_summary },
        { l: 'fr', n: svc.fr, s: svc.fr_summary },
      ];
      for (const loc of locs) {
        const trExist = await tx.service_translations.findUnique({ where: { service_id_locale: { service_id: service.id, locale: loc.l } } });
        if (!trExist) {
          await tx.service_translations.create({
            data: { service_id: service.id, locale: loc.l, name: loc.n, summary: loc.s, description: loc.s },
          });
        }
      }
      const sbsExist = await tx.service_branch_settings.findUnique({
        where: { service_id_branch_id: { service_id: service.id, branch_id: sarahBranch.id } },
      });
      if (!sbsExist) {
        await tx.service_branch_settings.create({ data: { service_id: service.id, branch_id: sarahBranch.id, is_enabled: true } });
      }
    }

    for (let i = 1; i <= 3; i++) {
      await ensureResource(sarahCompany.id, sarahBranch.id, resourceTypes['STYLING_CHAIR'], `Styling Chair ${i}`, 'chair', `SB-S${i}`, 'Professional styling chair');
    }
    for (let i = 1; i <= 3; i++) {
      await ensureResource(sarahCompany.id, sarahBranch.id, resourceTypes['NAIL_TABLE'], `Nail Table ${i}`, 'table', `SB-N${i}`, 'Manicure nail table station');
    }
    for (let i = 1; i <= 2; i++) {
      await ensureResource(sarahCompany.id, sarahBranch.id, resourceTypes['PEDICURE_CHAIR'], `Pedicure Chair ${i}`, 'chair', `SB-P${i}`, 'Pedicure spa chair with foot bath');
    }
    await ensureResource(sarahCompany.id, sarahBranch.id, resourceTypes['MAKEUP_STATION'], 'Makeup Station', 'equipment', 'SB-MU1', 'Professional makeup vanity station');
    console.log('  Sarah Beauty Salon resources created');

    const sarahReviews = [
      { text: 'Sarah did an amazing job with my hair color. Exactly what I wanted!', overall: 5, userId: reviewCustomerUsers[0], pro: sarahPro },
      { text: 'Mira\'s nail art is absolutely stunning. So talented!', overall: 5, userId: reviewCustomerUsers[1], pro: miraPro },
      { text: 'Great blowout service. My hair looked amazing for 3 days.', overall: 4, userId: reviewCustomerUsers[2], pro: sarahPro },
      { text: 'Bridal package was perfect. Felt like a princess on my wedding day.', overall: 5, userId: reviewCustomerUsers[3], pro: sarahPro },
      { text: 'Relaxing spa pedicure. Will definitely be back!', overall: 4, userId: reviewCustomerUsers[4], pro: miraPro },
    ];
    const existingSarahReviews = await tx.reviews.count({ where: { company_id: sarahCompany.id } });
    if (existingSarahReviews === 0) {
      for (let i = 0; i < sarahReviews.length; i++) {
        const rv = sarahReviews[i];
        const review = await tx.reviews.create({
          data: {
            author_user_id: rv.userId, company_id: sarahCompany.id, branch_id: sarahBranch.id,
            professional_id: rv.pro.id, service_id: sarahServices[i % sarahServices.length],
            body: rv.text, overall_rating: rv.overall, is_verified: true, status: 'published',
            published_at: new Date(Date.now() - (i + 1) * 3 * 24 * 60 * 60 * 1000),
          },
        });
        const dimsToAdd = ['quality', 'cleanliness', 'professionalism', 'punctuality', 'value', 'service'];
        for (const d of dimsToAdd) {
          try {
            await tx.review_ratings.create({ data: { review_id: review.id, dimension: d, rating: Math.max(3, rv.overall) } });
          } catch (e) { /* ignore */ }
        }
      }
    }
    console.log('  Sarah Beauty Salon reviews created');
    console.log('  Sarah Beauty Salon: COMPLETE');

    const spaOwner = await createUser({
      email: 'spa_owner@lookiva.dev', password: 'Spa123!', full_name: 'Lina Spa Owner', phone: '+96170777888',
    });
    await ensureRoleScope(spaOwner.id, businessOwnerRole.id, 'business_owner', 'company', 'spa-pending');
    const spaOwnerProf = await tx.user_profiles.findUnique({ where: { user_id: spaOwner.id } });
    if (!spaOwnerProf) {
      await tx.user_profiles.create({
        data: { user_id: spaOwner.id, first_name: 'Lina', last_name: 'Spa Owner', country_id: lbCountry.id, city_id: jouniehCity?.id || null, completed_onboarding: true },
      });
    }
    await ensureCustomer(spaOwner.id);

    const blissCompany = await tx.companies.upsert({
      where: { slug: 'bliss-spa-jounieh' },
      create: {
        owner_user_id: spaOwner.id, country_id: lbCountry.id, city_id: jouniehCity?.id || null,
        category_ids: [spasCat.id, skincareCat.id],
        display_name: 'Bliss Spa', slug: 'bliss-spa-jounieh',
        description_short: 'Tranquil day spa in Jounieh',
        description_long: 'Bliss Spa is a tranquil wellness retreat located in the scenic coastal city of Jounieh. Our expert therapists provide rejuvenating massages, luxurious facials, body treatments, and holistic wellness experiences. Step into a world of calm and let us melt away your stress with our signature treatments.',
        tagline: 'Find Your Inner Bliss',
        avg_rating: 4.8, review_count: 5, follower_count: 300, view_count: 4500,
        is_verified: true, verified_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        published_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        is_active: true, booking_enabled: true, walk_ins_enabled: false,
        online_payments_enabled: false, auto_confirm_bookings: true, deposit_required: false,
      },
      update: {},
    });

    await tx.company_settings.upsert({
      where: { company_id: blissCompany.id },
      create: {
        company_id: blissCompany.id,
        facilities: ['wifi', 'air_conditioning', 'sauna', 'steam_room', 'shower', 'locker'],
        languages_spoken: ['en', 'ar', 'fr'],
        accepted_payments: ['cash', 'card', 'visa', 'mastercard'],
        parking_options: ['private_lot', 'street'],
        home_service_enabled: false,
      },
      update: {},
    });
    await ensureRoleScope(spaOwner.id, businessOwnerRole.id, 'business_owner', 'company', blissCompany.id, blissCompany.id);

    const blissBranch = await tx.branches.upsert({
      where: { company_id_slug: { company_id: blissCompany.id, slug: 'jounieh-main' } },
      create: {
        company_id: blissCompany.id, name: 'Jounieh Main', slug: 'jounieh-main',
        country_id: lbCountry.id, city_id: jouniehCity?.id || null, area_id: jouniehArea?.id || null, region_id: mountLebanonRegion?.id || null,
        address_line_1: 'Jounieh Bay, Casino du Liban Road',
        latitude: 33.9764, longitude: 35.6231,
        phone: '+9619876543', whatsapp: '+96170888999',
        is_main: true, is_active: true, timezone: 'Asia/Beirut',
        booking_enabled: true, walk_ins_enabled: false, home_service_enabled: false,
      },
      update: {},
    });

    const blissLocExist = await tx.branch_locations.findUnique({ where: { branch_id: blissBranch.id } });
    if (!blissLocExist) {
      await tx.branch_locations.create({ data: { branch_id: blissBranch.id, address: 'Jounieh Bay, Casino du Liban Road' } });
    }
    await tx.$executeRawUnsafe(
      `UPDATE branch_locations SET point = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE branch_id = $3`,
      35.6231, 33.9764, blissBranch.id
    );
    for (let dow = 1; dow <= 6; dow++) {
      await ensureBranchHours(blissBranch.id, dow, { is_closed: false, opens_at: '10:00', closes_at: '22:00', slot_size_minutes: 30 });
    }
    await ensureBranchHours(blissBranch.id, 0, { is_closed: false, opens_at: '11:00', closes_at: '20:00', slot_size_minutes: 30 });

    const rimaUser = await createUser({ email: 'rima@blissspa.lb', password: 'Rima123!', full_name: 'Rima Therapist', phone: '+96170999000' });
    await ensureRoleScope(rimaUser.id, professionalRole.id, 'professional', 'company', blissCompany.id, blissCompany.id, blissBranch.id);
    const rimaProfExist = await tx.user_profiles.findUnique({ where: { user_id: rimaUser.id } });
    if (!rimaProfExist) {
      await tx.user_profiles.create({
        data: { user_id: rimaUser.id, first_name: 'Rima', last_name: 'Therapist', country_id: lbCountry.id, city_id: jouniehCity?.id || null, completed_onboarding: true },
      });
    }
    const omarUser = await createUser({ email: 'omar@blissspa.lb', password: 'Omar123!', full_name: 'Omar Therapist', phone: '+96170111000' });
    await ensureRoleScope(omarUser.id, professionalRole.id, 'professional', 'company', blissCompany.id, blissCompany.id, blissBranch.id);
    const omarProfExist = await tx.user_profiles.findUnique({ where: { user_id: omarUser.id } });
    if (!omarProfExist) {
      await tx.user_profiles.create({
        data: { user_id: omarUser.id, first_name: 'Omar', last_name: 'Therapist', country_id: lbCountry.id, city_id: jouniehCity?.id || null, completed_onboarding: true },
      });
    }

    const blissPros = [];
    const existing_linaPro = await tx.professionals.findFirst({
      where: {
        user_id: spaOwner.id,
        company_id: blissCompany.id,
      },
    });

    const linaPro =
      existing_linaPro ??
      (await tx.professionals.create({
        data: {
        user_id: spaOwner.id, company_id: blissCompany.id, branch_ids: [blissBranch.id],
        display_name: 'Lina - Lead Therapist & Owner',
        specialties: ['Swedish Massage', 'Deep Tissue', 'Facial Treatments', 'Body Scrub'],
        years_experience: 8, avg_rating: 4.9, review_count: 2, follower_count: 180,
        is_verified: true, verified_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        is_active: true, accepts_walk_ins: false,
        },
      }));
    blissPros.push(linaPro);
    const existing_rimaPro = await tx.professionals.findFirst({
      where: {
        user_id: rimaUser.id,
        company_id: blissCompany.id,
      },
    });

    const rimaPro =
      existing_rimaPro ??
      (await tx.professionals.create({
        data: {
        user_id: rimaUser.id, company_id: blissCompany.id, branch_ids: [blissBranch.id],
        display_name: 'Rima - Senior Therapist',
        specialties: ['Hot Stone Massage', 'Aromatherapy', 'Facial', 'Anti-Aging'],
        years_experience: 5, avg_rating: 4.8, review_count: 2, follower_count: 100,
        is_active: true, accepts_walk_ins: false,
        },
      }));
    blissPros.push(rimaPro);
    const existing_omarPro = await tx.professionals.findFirst({
      where: {
        user_id: omarUser.id,
        company_id: blissCompany.id,
      },
    });

    const omarPro =
      existing_omarPro ??
      (await tx.professionals.create({
        data: {
        user_id: omarUser.id, company_id: blissCompany.id, branch_ids: [blissBranch.id],
        display_name: 'Omar - Massage Specialist',
        specialties: ['Deep Tissue', 'Sports Massage', 'Thai Massage'],
        years_experience: 4, avg_rating: 4.7, review_count: 1, follower_count: 70,
        is_active: true, accepts_walk_ins: false,
        },
      }));
    blissPros.push(omarPro);

    for (const pro of blissPros) {
      const ppExist = await tx.professional_profiles.findUnique({ where: { professional_id: pro.id } });
      if (!ppExist) {
        await tx.professional_profiles.create({
          data: {
            professional_id: pro.id, user_id: pro.user_id,
            education: ['International Therapy Training Center'],
            certifications: ['Certified Massage Therapist', 'Beauty Therapy Diploma'],
            languages_spoken: pro.display_name.includes('Lina') ? ['en', 'ar', 'fr'] : ['en', 'ar'],
          },
        });
      }
      const pbExist = await tx.professional_branches.findUnique({
        where: { professional_id_branch_id: { professional_id: pro.id, branch_id: blissBranch.id } },
      });
      if (!pbExist) {
        await tx.professional_branches.create({ data: { professional_id: pro.id, branch_id: blissBranch.id, is_primary: true } });
      }
      for (let dow = 1; dow <= 6; dow++) {
        await ensureProfessionalSchedule(pro.id, blissBranch.id, dow, '10:00', '22:00');
      }
    }

    const blissServices = [
      { slug: 'swedish-massage-60', name: 'Swedish Massage 60min', ar: 'ØªØ¯Ù„ÙŠÙƒ Ø³ÙˆÙŠØ¯ÙŠ 60 Ø¯Ù‚ÙŠÙ‚Ø©', fr: 'Massage SuÃ©dois 60min', summary: 'Classic relaxation massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ Ù„Ù„Ø§Ø³ØªØ±Ø®Ø§Ø¡', fr_summary: 'Massage relaxant classique', duration: 60, price: 50 },
      { slug: 'swedish-massage-90', name: 'Swedish Massage 90min', ar: 'ØªØ¯Ù„ÙŠÙƒ Ø³ÙˆÙŠØ¯ÙŠ 90 Ø¯Ù‚ÙŠÙ‚Ø©', fr: 'Massage SuÃ©dois 90min', summary: 'Extended relaxation massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ Ø§Ø³ØªØ±Ø®Ø§Ø¡ Ù…Ù…ØªØ¯', fr_summary: 'Massage relaxant prolongÃ©', duration: 90, price: 75 },
      { slug: 'deep-tissue-60', name: 'Deep Tissue 60min', ar: 'ØªØ¯Ù„ÙŠÙƒ Ø£Ù†Ø³Ø¬Ø© Ø¹Ù…ÙŠÙ‚Ø© 60Ø¯', fr: 'Massage Tissu Profond', summary: 'Deep muscle tension relief massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ Ù„ØªÙ‡Ø¯ÙŠØ¯ Ø§Ù„ØªÙˆØªØ± Ø§Ù„Ø¹Ø¶Ù„ÙŠ Ø§Ù„Ø¹Ù…ÙŠÙ‚', fr_summary: 'Massage soulagement tension profonde', duration: 60, price: 60 },
      { slug: 'hot-stone-massage', name: 'Hot Stone Massage', ar: 'ØªØ¯Ù„ÙŠÙƒ Ø¨Ø§Ù„Ø­Ø¬Ø§Ø±Ø© Ø§Ù„Ø³Ø§Ø®Ù†Ø©', fr: 'Massage Pierres Chaudes', summary: 'Hot stone therapy massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ Ø¹Ù„Ø§Ø¬ÙŠ Ø¨Ø§Ù„Ø­Ø¬Ø§Ø±Ø© Ø§Ù„Ø³Ø§Ø®Ù†Ø©', fr_summary: 'Massage thÃ©rapie pierres chaudes', duration: 75, price: 80 },
      { slug: 'thai-massage', name: 'Thai Massage', ar: 'ØªØ¯Ù„ÙŠÙƒ ØªØ§ÙŠÙ„Ù†Ø¯ÙŠ', fr: 'Massage ThaÃ¯', summary: 'Traditional Thai bodywork massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ ØªØ§ÙŠÙ„Ø§Ù†Ø¯ÙŠ ØªÙ‚Ù„ÙŠØ¯ÙŠ', fr_summary: 'Massage corporel thaÃ¯ traditionnel', duration: 60, price: 65 },
      { slug: 'aromatherapy-massage', name: 'Aromatherapy Massage', ar: 'ØªØ¯Ù„ÙŠÙƒ Ø¨Ø§Ù„Ø²ÙŠÙˆØª Ø§Ù„Ø¹Ø·Ø±ÙŠØ©', fr: 'Massage AromathÃ©rapie', summary: 'Essential oil aromatic massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ Ø¹Ø·Ø±ÙŠ Ø¨Ø§Ù„Ø²ÙŠÙˆØª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©', fr_summary: 'Massage aromatique huiles essentielles', duration: 60, price: 65 },
      { slug: 'signature-facial', name: 'Signature Bliss Facial', ar: 'Ù‚Ø¶Ø§Ø¡ Ø§Ù„Ø¨Ù„ÙŠØ³ Ø§Ù„Ù…Ù…ÙŠØ²', fr: 'Soin Visage Signature Bliss', summary: 'Our signature holistic facial', ar_summary: 'Ù‚Ø¶Ø§Ø¡ ÙˆØ¬Ù‡ Ø´Ø§Ù…Ù„ Ù…Ù…ÙŠØ²', fr_summary: 'Notre soin visage holistique signature', duration: 75, price: 70 },
      { slug: 'hydrating-facial', name: 'Hydrating Facial', ar: 'Ù‚Ø¶Ø§Ø¡ ØªØ±Ø·ÙŠØ¨ Ù„Ù„ÙˆØ¬Ù‡', fr: 'Soin Visage Hydratant', summary: 'Deep moisture boost facial', ar_summary: 'Ù‚Ø¶Ø§Ø¡ ÙˆØ¬Ù‡ Ù„Ø²ÙŠØ§Ø¯Ø© Ø§Ù„ØªØ±Ø·ÙŠØ¨', fr_summary: 'Soin visage boost hydratation', duration: 60, price: 55 },
      { slug: 'anti-aging-facial', name: 'Anti-Aging Facial', ar: 'Ù‚Ø¶Ø§Ø¡ Ù…Ø¶Ø§Ø¯ Ù„Ù„ØªØ¬Ø§Ø¹ÙŠØ¯', fr: 'Soin Visage Anti-Ã‚ge', summary: 'Firming and lifting facial treatment', ar_summary: 'Ø¹Ù„Ø§Ø¬ ÙˆØ¬Ù‡ Ù…Ø´Ø¯Ø¯ ÙˆÙ…Ø´Ø¯ Ù„Ù„ÙˆØ¬Ù‡', fr_summary: 'Soin visage raffermissant liftant', duration: 90, price: 90 },
      { slug: 'body-scrub', name: 'Body Scrub & Wrap', ar: 'ÙØ±Ùƒ ÙˆØªØºÙ„ÙŠÙ Ø§Ù„Ø¬Ø³Ù…', fr: 'Gommage et Enveloppement', summary: 'Exfoliating body scrub with wrap', ar_summary: 'ÙØ±Ùƒ Ù…Ù‚Ø´Ø± Ù„Ù„Ø¬Ø³Ù… Ù…Ø¹ ØªØºÙ„ÙŠÙ', fr_summary: 'Gommage exfoliant avec enveloppement', duration: 60, price: 55 },
      { slug: 'body-wrap', name: 'Detox Body Wrap', ar: 'ØªØºÙ„ÙŠÙ Ø¬Ø³Ù… Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø³Ù…ÙˆÙ…', fr: 'Enveloppement DÃ©tox', summary: 'Detoxifying and slimming body wrap', ar_summary: 'ØªØºÙ„ÙŠÙ Ø¬Ø³Ù… Ù…Ù†Ù‚Ø° ÙˆÙ…Ù‚Ø´Ø± Ù„Ù„ØªÙ†Ø­ÙŠÙ', fr_summary: 'Enveloppement dÃ©tox amincissante', duration: 45, price: 50 },
      { slug: 'sauna-session', name: 'Sauna Session', ar: 'Ø¬Ù„Ø³Ø© Ø³Ø§ÙˆÙ†Ø§', fr: 'Session Sauna', summary: 'Dry heat sauna session', ar_summary: 'Ø¬Ù„Ø³Ø© Ø³Ø§ÙˆÙ†Ø§ Ø­Ø±Ø§Ø±Ø© Ø¬Ø§ÙØ©', fr_summary: 'Session sauna chaleur sÃ¨che', duration: 30, price: 15 },
      { slug: 'couples-massage', name: 'Couples Massage Package', ar: 'Ø¨Ø§Ù‚Ø© ØªØ¯Ù„ÙŠÙƒ Ù„Ù„Ø£Ø²ÙˆØ§Ø¬', fr: 'Forfait Massage Couples', summary: 'Side-by-side couples massage', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ Ù„Ù„Ø£Ø²ÙˆØ§Ø¬ Ø¬Ù†Ø¨Ø§Ù‹ Ø¥Ù„Ù‰ Ø¬Ù†Ø¨', fr_summary: 'Massage couples cÃ´te Ã  cÃ´te', duration: 60, price: 110 },
      { slug: 'day-spa-package', name: 'Day Spa Package', ar: 'Ø¨Ø§Ù‚Ø© Ø§Ù„Ø³Ø¨Ø§ Ø§Ù„ÙŠÙˆÙ…ÙŠ', fr: 'Forfait Spa JournÃ©e', summary: 'Massage, facial, scrub full day', ar_summary: 'ØªØ¯Ù„ÙŠÙƒ ÙˆÙ‚Ø¶Ø§Ø¡ ÙˆÙØ±Ùƒ Ù„ÙŠÙˆÙ… ÙƒØ§Ù…Ù„', fr_summary: 'Massage, soin, gommage journÃ©e', duration: 180, price: 150 },
      { slug: 'foot-massage', name: 'Foot Reflexology', ar: 'ØªØ¯Ù„ÙŠÙƒ Ø§Ù„Ù‚Ø¯Ù… Ø§Ù„Ø¥Ù†Ø¹ÙƒØ§Ø³ÙŠ', fr: 'RÃ©flexologie Plantaire', summary: 'Foot reflexology therapy', ar_summary: 'Ø¹Ù„Ø§Ø¬ Ø¥Ù†Ø¹ÙƒØ§Ø³ÙŠ Ù„Ù„Ù‚Ø¯Ù…', fr_summary: 'ThÃ©rapie rÃ©flexologie plantaire', duration: 45, price: 30 },
    ];

    const blissSvcIds: string[] = [];
    for (const svc of blissServices) {
      const service = await tx.services.upsert({
        where: { company_id_slug: { company_id: blissCompany.id, slug: svc.slug } },
        create: {
          company_id: blissCompany.id, category_id: spasCat.id, branch_ids: [blissBranch.id],
          professional_ids: blissPros.map(p => p.id),
          slug: svc.slug, name: svc.name, summary: svc.summary, description: svc.summary,
          duration_minutes: svc.duration, base_price: svc.price, currency_code: 'USD',
          tax_inclusive: true, is_active: true,
          is_featured: svc.slug === 'swedish-massage-60' || svc.slug === 'signature-facial' || svc.slug === 'day-spa-package',
          walk_ins_allowed: false, home_service_allowed: false, online_payment_required: false,
          max_clients_per_slot: svc.slug === 'couples-massage' ? 2 : 1,
        },
        update: {},
      });
      blissSvcIds.push(service.id);
      const locs: Array<{ l: string; n: string; s: string }> = [
        { l: 'en', n: svc.name, s: svc.summary },
        { l: 'ar', n: svc.ar, s: svc.ar_summary },
        { l: 'fr', n: svc.fr, s: svc.fr_summary },
      ];
      for (const loc of locs) {
        const trExist = await tx.service_translations.findUnique({ where: { service_id_locale: { service_id: service.id, locale: loc.l } } });
        if (!trExist) {
          await tx.service_translations.create({ data: { service_id: service.id, locale: loc.l, name: loc.n, summary: loc.s, description: loc.s } });
        }
      }
      const sbsExist = await tx.service_branch_settings.findUnique({
        where: { service_id_branch_id: { service_id: service.id, branch_id: blissBranch.id } },
      });
      if (!sbsExist) {
        await tx.service_branch_settings.create({ data: { service_id: service.id, branch_id: blissBranch.id, is_enabled: true } });
      }
    }

    for (let i = 1; i <= 3; i++) {
      await ensureResource(blissCompany.id, blissBranch.id, resourceTypes['MASSAGE_ROOM'], `Massage Room ${i}`, 'room', `BL-MR${i}`, 'Private massage therapy room');
    }
    for (let i = 1; i <= 2; i++) {
      await ensureResource(blissCompany.id, blissBranch.id, resourceTypes['TREATMENT_ROOM'], `Treatment Room ${i}`, 'room', `BL-TR${i}`, 'Facial and body treatment room');
    }
    for (let i = 1; i <= 5; i++) {
      await ensureResource(blissCompany.id, blissBranch.id, resourceTypes['TREATMENT_BED'], `Treatment Bed ${i}`, 'bed', `BL-TB${i}`, 'Adjustable treatment bed');
    }
    console.log('  Bliss Spa resources created');

    const blissReviews = [
      { text: 'The deep tissue massage from Omar was incredible. All my tension gone!', overall: 5, userId: reviewCustomerUsers[0], pro: omarPro },
      { text: 'Lina\'s signature facial left my skin glowing. Pure bliss!', overall: 5, userId: reviewCustomerUsers[1], pro: linaPro },
      { text: 'Amazing couples massage experience. We\'ll be regulars now.', overall: 5, userId: reviewCustomerUsers[2], pro: rimaPro },
      { text: 'Hot stone massage was so relaxing. Beautiful ambiance too.', overall: 4, userId: reviewCustomerUsers[3], pro: rimaPro },
      { text: 'Day spa package is the best value. Worth every Lira.', overall: 5, userId: reviewCustomerUsers[4], pro: linaPro },
    ];
    const existingBlissReviews = await tx.reviews.count({ where: { company_id: blissCompany.id } });
    if (existingBlissReviews === 0) {
      for (let i = 0; i < blissReviews.length; i++) {
        const rv = blissReviews[i];
        const review = await tx.reviews.create({
          data: {
            author_user_id: rv.userId, company_id: blissCompany.id, branch_id: blissBranch.id,
            service_id: blissSvcIds[i % blissSvcIds.length], professional_id: rv.pro.id,
            body: rv.text, overall_rating: rv.overall, is_verified: true, status: 'published',
            published_at: new Date(Date.now() - (i + 1) * 5 * 24 * 60 * 60 * 1000),
          },
        });
        for (const d of ['quality', 'cleanliness', 'professionalism', 'punctuality', 'value', 'service']) {
          try {
            await tx.review_ratings.create({ data: { review_id: review.id, dimension: d, rating: Math.max(4, rv.overall - 0.5) } });
          } catch (e) { /* ignore */ }
        }
      }
    }
    console.log('  Bliss Spa reviews created');
    console.log('  Bliss Spa: COMPLETE');

    console.log(`\n  Demo Businesses: 3 companies, 3 branches, 7 professionals, 35 services, 20 reviews total`);
  });

  console.log('=== Demo Businesses Seeding Complete ===\n');
}

