import { PrismaClient } from '@prisma/client';

export async function seedCategories(prisma: PrismaClient) {
  console.log('\n=== Seeding Service Categories ===');

  await prisma.$transaction(async (tx) => {
    const categories = [
      {
        slug: 'barbers',
        name: 'Barbers',
        name_translations: { en: 'Barbers', ar: 'حلاقين رجالي', fr: 'Barbiers' },
        description: 'Professional men\'s barbershops offering haircuts, beard trimming, and classic grooming services.',
        description_translations: {
          en: 'Professional men\'s barbershops offering haircuts, beard trimming, and classic grooming services.',
          ar: 'محلات حلاقة رجالية احترافية تقدم قصات الشعر وتقليم اللحية وخدمات العناية الكلاسيكية.',
          fr: 'Salons de coiffure pour hommes professionnels proposant coupes de cheveux, taille de barbe et services de toilettage classiques.',
        },
        is_featured: true,
        depth_level: 0,
        sort_order: 1,
      },
      {
        slug: 'mens-salons',
        name: 'Men\'s Salons',
        name_translations: { en: 'Men\'s Salons', ar: 'صالونات رجالية', fr: 'Salons pour Hommes' },
        description: 'Full-service men\'s salons with advanced grooming, skincare, and styling treatments.',
        description_translations: {
          en: 'Full-service men\'s salons with advanced grooming, skincare, and styling treatments.',
          ar: 'صالونات رجالية كاملة الخدمات مع عناية متقدمة بالبشرة وتصفيف الشعر.',
          fr: 'Salons pour hommes à service complet avec des soins de toilettage, de peau et de coiffage avancés.',
        },
        is_featured: true,
        depth_level: 0,
        sort_order: 2,
      },
      {
        slug: 'womens-salons',
        name: 'Women\'s Salons',
        name_translations: { en: 'Women\'s Salons', ar: 'صالونات نسائية', fr: 'Salons pour Femmes' },
        description: 'Elegant women\'s salons offering hair styling, coloring, manicures, and complete beauty services.',
        description_translations: {
          en: 'Elegant women\'s salons offering hair styling, coloring, manicures, and complete beauty services.',
          ar: 'صالونات نسائية أنيقة تقدم تصفيف الشعر والتلوين والمانيكير وخدمات تجميل كاملة.',
          fr: 'Salons de coiffure pour femmes élégants proposant coiffage, coloration, manucure et services de beauté complets.',
        },
        is_featured: true,
        depth_level: 0,
        sort_order: 3,
      },
      {
        slug: 'unisex-salons',
        name: 'Unisex Salons',
        name_translations: { en: 'Unisex Salons', ar: 'صالونات مختلطة', fr: 'Salons Unisexes' },
        description: 'Modern unisex salons catering to all genders with comprehensive hair and beauty services.',
        description_translations: {
          en: 'Modern unisex salons catering to all genders with comprehensive hair and beauty services.',
          ar: 'صالونات حديثة مختلطة لجميع الأجناس مع خدمات شعر وتجميل شاملة.',
          fr: 'Salons unisexes modernes pour tous les genres avec des services de coiffure et de beauté complets.',
        },
        is_featured: true,
        depth_level: 0,
        sort_order: 4,
      },
      {
        slug: 'hairstylists',
        name: 'Hairstylists',
        name_translations: { en: 'Hairstylists', ar: 'مصففي الشعر', fr: 'Coiffeurs' },
        description: 'Expert hairstylists specializing in cuts, styling, and personalized hair consultations.',
        description_translations: {
          en: 'Expert hairstylists specializing in cuts, styling, and personalized hair consultations.',
          ar: 'مصففي شعر خبراء متخصصون في القص والتصفيف والاستشارات الشخصية للشعر.',
          fr: 'Coiffeurs experts spécialisés dans les coupes, le coiffage et les consultations capillaires personnalisées.',
        },
        is_featured: true,
        depth_level: 0,
        sort_order: 5,
      },
      {
        slug: 'hair-colorists',
        name: 'Hair Colorists',
        name_translations: { en: 'Hair Colorists', ar: 'متخصصو تلوين الشعر', fr: 'Coloristes Capillaires' },
        description: 'Skilled hair color specialists for highlights, balayage, full color, and color corrections.',
        description_translations: {
          en: 'Skilled hair color specialists for highlights, balayage, full color, and color corrections.',
          ar: 'متخصصو ماهرون في تلوين الشعر للخصلات والبالياج والتلوين الكامل وتصحيح الألوان.',
          fr: 'Spécialistes qualifiés de la couleur des cheveux pour mèches, balayage, couleur complète et corrections de couleur.',
        },
        is_featured: true,
        depth_level: 0,
        sort_order: 6,
      },
      {
        slug: 'beard-specialists',
        name: 'Beard Specialists',
        name_translations: { en: 'Beard Specialists', ar: 'متخصصو اللحية', fr: 'Spécialistes de la Barbe' },
        description: 'Beard grooming experts for precise trims, shaping, styling, and beard care treatments.',
        description_translations: {
          en: 'Beard grooming experts for precise trims, shaping, styling, and beard care treatments.',
          ar: 'خبراء عناية باللحية لتقليم دقيق وتشكيل وتصفيف ومعالجات عناية باللحية.',
          fr: 'Experts en soin de la barbe pour tailles précises, façonnage, coiffage et traitements de soin.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 7,
      },
      {
        slug: 'nail-professionals',
        name: 'Nail Professionals',
        name_translations: { en: 'Nail Professionals', ar: 'متخصصو الأظافر', fr: 'Professionnels des Ongles' },
        description: 'Nail technicians offering manicures, pedicures, nail art, gel, and acrylic nail services.',
        description_translations: {
          en: 'Nail technicians offering manicures, pedicures, nail art, gel, and acrylic nail services.',
          ar: 'فنيو أظافر يقدمون المانيكير والباديكير ونقلش الأظافر والجل والأكريليك.',
          fr: 'Techniciens des ongles proposant manucures, pédicures, nail art, services vernis gel et acryliques.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 8,
      },
      {
        slug: 'makeup-artists',
        name: 'Makeup Artists',
        name_translations: { en: 'Makeup Artists', ar: 'فنانو المكياج', fr: 'Artistes Maquilleurs' },
        description: 'Professional makeup artists for everyday, event, bridal, and editorial makeup looks.',
        description_translations: {
          en: 'Professional makeup artists for everyday, event, bridal, and editorial makeup looks.',
          ar: 'فنانو مكياج محترفون للمظهر اليومي والمناسبات والعروسة والمكياج التحريري.',
          fr: 'Artistes maquilleurs professionnels pour looks quotidiens, événements, mariage et éditoriaux.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 9,
      },
      {
        slug: 'beauty-centers',
        name: 'Beauty Centers',
        name_translations: { en: 'Beauty Centers', ar: 'مراكز التجميل', fr: 'Centres de Beauté' },
        description: 'Full-service beauty centers offering hair, skin, nails, and body treatments under one roof.',
        description_translations: {
          en: 'Full-service beauty centers offering hair, skin, nails, and body treatments under one roof.',
          ar: 'مراكز تجميل كاملة الخدمات تقدم علاجات الشعر والبشرة والأظافر والجسم تحت سقف واحد.',
          fr: 'Centres de beauté à service complet proposant soins cheveux, peau, ongles et corps sous un même toit.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 10,
      },
      {
        slug: 'spas',
        name: 'Spas',
        name_translations: { en: 'Spas', ar: 'المنتجعات الصحية', fr: 'Spas' },
        description: 'Relaxing spa experiences with massages, body treatments, facials, and wellness therapies.',
        description_translations: {
          en: 'Relaxing spa experiences with massages, body treatments, facials, and wellness therapies.',
          ar: 'تجارب سبا مريحة مع المساجات وعلاجات الجسم والبشرة والعلاجات الصحية.',
          fr: 'Expériences de spa relaxantes avec massages, soins du corps, du visage et thérapies de bien-être.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 11,
      },
      {
        slug: 'skincare',
        name: 'Skincare',
        name_translations: { en: 'Skincare', ar: 'عناية بالبشرة', fr: 'Soins de la Peau' },
        description: 'Specialized skincare clinics offering facials, peels, acne treatment, and dermatological services.',
        description_translations: {
          en: 'Specialized skincare clinics offering facials, peels, acne treatment, and dermatological services.',
          ar: 'عيادات متخصصة في عناية البشرة تقدم علاجات الوجه والتقشير وعلاج حب الشباب والخدمات الجلدية.',
          fr: 'Cliniques spécialisées en soin de la peau proposant soins du visage, peelings, traitement de l\'acné et services dermatologiques.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 12,
      },
      {
        slug: 'bridal',
        name: 'Bridal',
        name_translations: { en: 'Bridal', ar: 'خدمات العروسة', fr: 'Services de Mariée' },
        description: 'Complete bridal beauty packages including hair, makeup, nails, and pre-wedding treatments.',
        description_translations: {
          en: 'Complete bridal beauty packages including hair, makeup, nails, and pre-wedding treatments.',
          ar: 'باقات تجميل عروسة كاملة تشمل الشعر والمكياج والأظافر وعلاجات ما قبل الزفاف.',
          fr: 'Forfaits de beauté de mariée complets incluant cheveux, maquillage, ongles et soins pré-mariage.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 13,
      },
      {
        slug: 'freelancers',
        name: 'Freelancers',
        name_translations: { en: 'Freelancers', ar: 'المستقلون', fr: 'Freelances' },
        description: 'Independent freelance beauty professionals available for appointments and home services.',
        description_translations: {
          en: 'Independent freelance beauty professionals available for appointments and home services.',
          ar: 'محترفو تجميل مستقلون متاحون للحجوزات وخدمات المنزل.',
          fr: 'Professionnels de beauté indépendants disponibles pour rendez-vous et services à domicile.',
        },
        is_featured: false,
        depth_level: 0,
        sort_order: 14,
      },
      {
        slug: 'home-service',
        name: 'Home Service',
        name_translations: { en: 'Home Service', ar: 'خدمة المنزل', fr: 'Service à Domicile' },
        description: 'Beauty and grooming services conveniently delivered to your home by certified professionals.',
        description_translations: {
          en: 'Beauty and grooming services conveniently delivered to your home by certified professionals.',
          ar: 'خدمات تجميل وعناية توصل لك في منزلك بسهولة بواسطة محترفين معتمدين.',
          fr: 'Services de beauté et de toilettage livrés commodément à votre domicile par des professionnels certifiés.',
        },
        is_featured: false,
        depth_level: 0,
        home_service_allowed: true,
        sort_order: 15,
      },
    ];

    for (const cat of categories) {
      await tx.service_categories.upsert({
        where: { slug: cat.slug },
        create: {
          slug: cat.slug,
          name: cat.name,
          name_translations: cat.name_translations,
          description: cat.description,
          description_translations: cat.description_translations,
          is_active: true,
          is_featured: cat.is_featured,
          depth_level: cat.depth_level,
          sort_order: cat.sort_order,
          home_service_allowed: (cat as any).home_service_allowed || false,
          requires_professional: true,
        },
        update: {},
      });
    }

    console.log(`  Service Categories: ${categories.length} root categories`);
  });

  console.log('=== Service Categories Seeding Complete ===\n');
}
