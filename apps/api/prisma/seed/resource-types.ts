import { PrismaClient } from '@prisma/client';

export async function seedResourceTypes(prisma: PrismaClient) {
  console.log('\n=== Seeding Resource Types ===');

  await prisma.$transaction(async (tx) => {
    const resourceTypes = [
      {
        code: 'BARBER_CHAIR',
        key: 'barber_chair',
        name: 'Barber Chair',
        description: 'Standard barber chair for men\'s haircut and beard grooming services.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 1,
      },
      {
        code: 'STYLING_CHAIR',
        key: 'styling_chair',
        name: 'Styling Chair',
        description: 'Hair styling chair for cutting, blow drying, and styling services.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 2,
      },
      {
        code: 'WASHING_STATION',
        key: 'washing_station',
        name: 'Washing Station',
        description: 'Hair washing and rinsing station with sink and reclining chair.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 3,
      },
      {
        code: 'COLORING_STATION',
        key: 'coloring_station',
        name: 'Coloring Station',
        description: 'Dedicated station for hair coloring, highlighting, and chemical treatments.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 4,
      },
      {
        code: 'NAIL_TABLE',
        key: 'nail_table',
        name: 'Nail Table',
        description: 'Manicure table with lamp and ventilation for nail services.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 5,
      },
      {
        code: 'PEDICURE_CHAIR',
        key: 'pedicure_chair',
        name: 'Pedicure Chair',
        description: 'Pedicure chair with foot spa and massage for foot care services.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 6,
      },
      {
        code: 'MAKEUP_STATION',
        key: 'makeup_station',
        name: 'Makeup Station',
        description: 'Makeup station with vanity mirror, lighting, and cosmetics setup.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 7,
      },
      {
        code: 'TREATMENT_BED',
        key: 'treatment_bed',
        name: 'Treatment Bed',
        description: 'Adjustable treatment bed for facials, skincare, and body treatments.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 8,
      },
      {
        code: 'TREATMENT_ROOM',
        key: 'treatment_room',
        name: 'Treatment Room',
        description: 'Private room for spa and wellness treatments and therapies.',
        default_capacity: 2,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 9,
      },
      {
        code: 'MASSAGE_ROOM',
        key: 'massage_room',
        name: 'Massage Room',
        description: 'Private room designed for massage therapy with soothing ambiance.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 10,
      },
      {
        code: 'BRIDAL_ROOM',
        key: 'bridal_room',
        name: 'Bridal Room',
        description: 'Private and spacious room for bridal preparation and party services.',
        default_capacity: 4,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 11,
      },
      {
        code: 'VIP_ROOM',
        key: 'vip_room',
        name: 'VIP Room',
        description: 'Premium private room for VIP clients with enhanced amenities.',
        default_capacity: 2,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 12,
      },
      {
        code: 'EQUIPMENT',
        key: 'equipment',
        name: 'Equipment',
        description: 'Shared equipment and tools for various beauty treatments.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 13,
      },
      {
        code: 'CUSTOM',
        key: 'custom',
        name: 'Custom',
        description: 'Custom resource type for business-specific scheduling needs.',
        default_capacity: 1,
        requires_booking: true,
        allow_parallel: false,
        sort_order: 14,
      },
    ];

    for (const rt of resourceTypes) {
      await tx.resource_types.upsert({
        where: { code: rt.code },
        create: {
          code: rt.code,
          key: rt.key,
          name: rt.name,
          description: rt.description,
          default_capacity: rt.default_capacity,
          requires_booking: rt.requires_booking,
          allow_parallel: rt.allow_parallel,
          sort_order: rt.sort_order,
          is_active: true,
        },
        update: {},
      });
    }

    console.log(`  Resource Types: ${resourceTypes.length} types created`);
  });

  console.log('=== Resource Types Seeding Complete ===\n');
}
