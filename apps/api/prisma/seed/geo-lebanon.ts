import { PrismaClient } from '@prisma/client';

export async function seedGeoLebanon(prisma: PrismaClient) {
  console.log('\n=== Seeding Lebanon Geography ===');

  await prisma.$transaction(async (tx) => {
    const country = await tx.countries.upsert({
      where: { iso_code: 'LB' },
      create: {
        iso_code: 'LB',
        name: 'Lebanon',
        native_name: 'لبنان',
        dial_code: '+961',
        currency_code: 'LBP',
        currency_symbol: 'ل.ل',
        flag_emoji: '🇱🇧',
        latitude: 33.8547,
        longitude: 35.8623,
        timezones: ['Asia/Beirut'],
        languages: ['en', 'ar', 'fr'],
        is_active: true,
        sort_order: 1,
      },
      update: {},
    });
    console.log(`  Country: ${country.name} (${country.iso_code})`);

    const regionData = [
      { code: 'BEI', name: 'Beirut', native_name: 'بيروت', latitude: 33.8938, longitude: 35.5018, sort_order: 1 },
      { code: 'ML', name: 'Mount Lebanon', native_name: 'جبل لبنان', latitude: 33.8167, longitude: 35.5833, sort_order: 2 },
      { code: 'NO', name: 'North', native_name: 'الشمال', latitude: 34.4381, longitude: 35.8308, sort_order: 3 },
      { code: 'SO', name: 'South', native_name: 'الجنوب', latitude: 33.2721, longitude: 35.2033, sort_order: 4 },
      { code: 'NA', name: 'Nabatieh', native_name: 'النبطية', latitude: 33.3761, longitude: 35.4839, sort_order: 5 },
      { code: 'BK', name: 'Bekaa', native_name: 'البقاع', latitude: 33.8667, longitude: 35.9167, sort_order: 6 },
      { code: 'BH', name: 'Baalbek-Hermel', native_name: 'بعلبك-الهرمل', latitude: 34.0058, longitude: 36.2181, sort_order: 7 },
      { code: 'AK', name: 'Akkar', native_name: 'عكار', latitude: 34.5333, longitude: 36.1333, sort_order: 8 },
    ];

    const regions: Record<string, { id: string; name: string }> = {};
    for (const r of regionData) {
      const region = await tx.regions.upsert({
        where: { country_id_code: { country_id: country.id, code: r.code } },
        create: {
          country_id: country.id,
          code: r.code,
          name: r.name,
          native_name: r.native_name,
          latitude: r.latitude,
          longitude: r.longitude,
          is_active: true,
          sort_order: r.sort_order,
        },
        update: {},
      });
      regions[r.code] = { id: region.id, name: region.name };
    }
    console.log(`  Regions: ${Object.keys(regions).length} governorates`);

    const districtData = [
      { code: 'BEI-1', region_code: 'BEI', name: 'Beirut 1st', native_name: 'بيروت الأولى', latitude: 33.8975, longitude: 35.5030 },
      { code: 'BEI-2', region_code: 'BEI', name: 'Beirut 2nd', native_name: 'بيروت الثانية', latitude: 33.8850, longitude: 35.5100 },
      { code: 'ACH', region_code: 'BEI', name: 'Achrafieh', native_name: 'الأشرفية', latitude: 33.8867, longitude: 35.5083 },
      { code: 'HAM', region_code: 'BEI', name: 'Hamra', native_name: 'الحمراء', latitude: 33.8960, longitude: 35.4820 },
      { code: 'GEM', region_code: 'BEI', name: 'Gemmayze', native_name: 'الجميزة', latitude: 33.8975, longitude: 35.5135 },
      { code: 'VER', region_code: 'BEI', name: 'Verdun', native_name: 'فردان', latitude: 33.8750, longitude: 35.4800 },
      { code: 'JOU', region_code: 'ML', name: 'Jounieh', native_name: 'جونيه', latitude: 33.9764, longitude: 35.6231 },
      { code: 'BYB', region_code: 'ML', name: 'Byblos', native_name: 'جبيل', latitude: 34.1222, longitude: 35.6494 },
      { code: 'TRI', region_code: 'NO', name: 'Tripoli', native_name: 'طرابلس', latitude: 34.4381, longitude: 35.8308 },
      { code: 'BAT', region_code: 'NO', name: 'Batroun', native_name: 'البترون', latitude: 34.2550, longitude: 35.6619 },
      { code: 'ZGH', region_code: 'NO', name: 'Zgharta', native_name: 'زغرتا', latitude: 34.3842, longitude: 35.9056 },
      { code: 'SAI', region_code: 'SO', name: 'Saida', native_name: 'صيدا', latitude: 33.5567, longitude: 35.3708 },
      { code: 'TYR', region_code: 'SO', name: 'Tyre', native_name: 'صور', latitude: 33.2721, longitude: 35.2033 },
      { code: 'SID', region_code: 'SO', name: 'Sidon', native_name: 'صيدا', latitude: 33.5567, longitude: 35.3708 },
      { code: 'ZAH', region_code: 'BK', name: 'Zahle', native_name: 'زحلة', latitude: 33.8496, longitude: 35.9040 },
      { code: 'BAA', region_code: 'BH', name: 'Baalbek', native_name: 'بعلبك', latitude: 34.0058, longitude: 36.2181 },
      { code: 'HER', region_code: 'BH', name: 'Hermel', native_name: 'الهرمل', latitude: 34.3969, longitude: 36.3758 },
      { code: 'ANJ', region_code: 'BK', name: 'Anjar', native_name: 'عنجر', latitude: 33.7300, longitude: 35.9200 },
      { code: 'CHT', region_code: 'BK', name: 'Chtaura', native_name: 'شتورة', latitude: 33.8200, longitude: 35.8800 },
      { code: 'RIY', region_code: 'BK', name: 'Riyaq', native_name: 'الرياق', latitude: 33.8500, longitude: 35.9300 },
      { code: 'AKA', region_code: 'AK', name: 'Akkar al-Atika', native_name: 'عكار العتيقة', latitude: 34.5800, longitude: 36.0800 },
      { code: 'HAL', region_code: 'AK', name: 'Halba', native_name: 'حلبا', latitude: 34.5500, longitude: 36.0800 },
      { code: 'BSH', region_code: 'NO', name: 'Bcharre', native_name: 'بشري', latitude: 34.2400, longitude: 35.9800 },
      { code: 'HAS', region_code: 'NA', name: 'Hasbaya', native_name: 'حاصبيا', latitude: 33.3800, longitude: 35.6800 },
      { code: 'MAR', region_code: 'NA', name: 'Marjeyoun', native_name: 'مرجعيون', latitude: 33.3300, longitude: 35.5600 },
      { code: 'DEA', region_code: 'ML', name: 'Deir el-Qamar', native_name: 'دير القمر', latitude: 33.5431, longitude: 35.5617 },
      { code: 'ALE', region_code: 'ML', name: 'Aley', native_name: 'عاليه', latitude: 33.8000, longitude: 35.6000 },
      { code: 'BRO', region_code: 'ML', name: 'Broummana', native_name: 'برمانا', latitude: 33.9167, longitude: 35.6000 },
      { code: 'BIK', region_code: 'ML', name: 'Bikfaya', native_name: 'بكفيا', latitude: 33.9625, longitude: 35.6236 },
    ];

    const districts: Record<string, { id: string; name: string; region_code: string }> = {};
    for (const d of districtData) {
      const district = await tx.districts.upsert({
        where: { region_id_code: { region_id: regions[d.region_code].id, code: d.code } },
        create: {
          region_id: regions[d.region_code].id,
          country_id: country.id,
          code: d.code,
          name: d.name,
          native_name: d.native_name,
          latitude: d.latitude,
          longitude: d.longitude,
          is_active: true,
          sort_order: Object.keys(districts).length + 1,
        },
        update: {},
      });
      districts[d.code] = { id: district.id, name: district.name, region_code: d.region_code };
    }
    console.log(`  Districts: ${Object.keys(districts).length}`);

    const cityData = [
      { name: 'Beirut', native_name: 'بيروت', district_code: 'BEI-1', region_code: 'BEI', latitude: 33.8938, longitude: 35.5018, timezone: 'Asia/Beirut' },
      { name: 'Tripoli', native_name: 'طرابلس', district_code: 'TRI', region_code: 'NO', latitude: 34.4381, longitude: 35.8308, timezone: 'Asia/Beirut' },
      { name: 'Saida', native_name: 'صيدا', district_code: 'SAI', region_code: 'SO', latitude: 33.5567, longitude: 35.3708, timezone: 'Asia/Beirut' },
      { name: 'Tyre', native_name: 'صور', district_code: 'TYR', region_code: 'SO', latitude: 33.2721, longitude: 35.2033, timezone: 'Asia/Beirut' },
      { name: 'Jounieh', native_name: 'جونيه', district_code: 'JOU', region_code: 'ML', latitude: 33.9764, longitude: 35.6231, timezone: 'Asia/Beirut' },
      { name: 'Byblos', native_name: 'جبيل', district_code: 'BYB', region_code: 'ML', latitude: 34.1222, longitude: 35.6494, timezone: 'Asia/Beirut' },
      { name: 'Zahle', native_name: 'زحلة', district_code: 'ZAH', region_code: 'BK', latitude: 33.8496, longitude: 35.9040, timezone: 'Asia/Beirut' },
      { name: 'Baalbek', native_name: 'بعلبك', district_code: 'BAA', region_code: 'BH', latitude: 34.0058, longitude: 36.2181, timezone: 'Asia/Beirut' },
      { name: 'Nabatieh', native_name: 'النبطية', district_code: 'MAR', region_code: 'NA', latitude: 33.3761, longitude: 35.4839, timezone: 'Asia/Beirut' },
      { name: 'Batroun', native_name: 'البترون', district_code: 'BAT', region_code: 'NO', latitude: 34.2550, longitude: 35.6619, timezone: 'Asia/Beirut' },
      { name: 'Zgharta', native_name: 'زغرتا', district_code: 'ZGH', region_code: 'NO', latitude: 34.3842, longitude: 35.9056, timezone: 'Asia/Beirut' },
      { name: 'Bcharre', native_name: 'بشري', district_code: 'BSH', region_code: 'NO', latitude: 34.2400, longitude: 35.9800, timezone: 'Asia/Beirut' },
      { name: 'Halba', native_name: 'حلبا', district_code: 'HAL', region_code: 'AK', latitude: 34.5500, longitude: 36.0800, timezone: 'Asia/Beirut' },
      { name: 'Chtaura', native_name: 'شتورة', district_code: 'CHT', region_code: 'BK', latitude: 33.8200, longitude: 35.8800, timezone: 'Asia/Beirut' },
      { name: 'Anjar', native_name: 'عنجر', district_code: 'ANJ', region_code: 'BK', latitude: 33.7300, longitude: 35.9200, timezone: 'Asia/Beirut' },
      { name: 'Riyaq', native_name: 'الرياق', district_code: 'RIY', region_code: 'BK', latitude: 33.8500, longitude: 35.9300, timezone: 'Asia/Beirut' },
      { name: 'Hasbaya', native_name: 'حاصبيا', district_code: 'HAS', region_code: 'NA', latitude: 33.3800, longitude: 35.6800, timezone: 'Asia/Beirut' },
      { name: 'Marjeyoun', native_name: 'مرجعيون', district_code: 'MAR', region_code: 'NA', latitude: 33.3300, longitude: 35.5600, timezone: 'Asia/Beirut' },
      { name: 'Hermel', native_name: 'الهرمل', district_code: 'HER', region_code: 'BH', latitude: 34.3969, longitude: 36.3758, timezone: 'Asia/Beirut' },
      { name: 'Akkar al-Atika', native_name: 'عكار العتيقة', district_code: 'AKA', region_code: 'AK', latitude: 34.5800, longitude: 36.0800, timezone: 'Asia/Beirut' },
      { name: 'Deir el-Qamar', native_name: 'دير القمر', district_code: 'DEA', region_code: 'ML', latitude: 33.5431, longitude: 35.5617, timezone: 'Asia/Beirut' },
      { name: 'Aley', native_name: 'عاليه', district_code: 'ALE', region_code: 'ML', latitude: 33.8000, longitude: 35.6000, timezone: 'Asia/Beirut' },
      { name: 'Broummana', native_name: 'برمانا', district_code: 'BRO', region_code: 'ML', latitude: 33.9167, longitude: 35.6000, timezone: 'Asia/Beirut' },
      { name: 'Bikfaya', native_name: 'بكفيا', district_code: 'BIK', region_code: 'ML', latitude: 33.9625, longitude: 35.6236, timezone: 'Asia/Beirut' },
      { name: 'Sidon', native_name: 'صيدا', district_code: 'SID', region_code: 'SO', latitude: 33.5567, longitude: 35.3708, timezone: 'Asia/Beirut' },
      { name: 'Achrafieh', native_name: 'الأشرفية', district_code: 'ACH', region_code: 'BEI', latitude: 33.8867, longitude: 35.5083, timezone: 'Asia/Beirut' },
      { name: 'Hamra Area', native_name: 'الحمراء', district_code: 'HAM', region_code: 'BEI', latitude: 33.8960, longitude: 35.4820, timezone: 'Asia/Beirut' },
      { name: 'Gemmayze', native_name: 'الجميزة', district_code: 'GEM', region_code: 'BEI', latitude: 33.8975, longitude: 35.5135, timezone: 'Asia/Beirut' },
      { name: 'Verdun', native_name: 'فردان', district_code: 'VER', region_code: 'BEI', latitude: 33.8750, longitude: 35.4800, timezone: 'Asia/Beirut' },
      { name: 'Badaro', native_name: 'بدارو', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8800, longitude: 35.4950, timezone: 'Asia/Beirut' },
      { name: 'Downtown Beirut', native_name: 'وسط بيروت', district_code: 'BEI-1', region_code: 'BEI', latitude: 33.8965, longitude: 35.5048, timezone: 'Asia/Beirut' },
      { name: 'Ain Mreisseh', native_name: 'عين المريسة', district_code: 'BEI-1', region_code: 'BEI', latitude: 33.9020, longitude: 35.4980, timezone: 'Asia/Beirut' },
      { name: 'Manara', native_name: 'المنارة', district_code: 'BEI-1', region_code: 'BEI', latitude: 33.9000, longitude: 35.4850, timezone: 'Asia/Beirut' },
      { name: 'Ramlet al-Baida', native_name: 'رملة البيضاء', district_code: 'BEI-1', region_code: 'BEI', latitude: 33.8890, longitude: 35.4780, timezone: 'Asia/Beirut' },
      { name: 'Kfarahbeil', native_name: 'كفرحبيل', district_code: 'BSH', region_code: 'NO', latitude: 34.2600, longitude: 35.9600, timezone: 'Asia/Beirut' },
      { name: 'Ain Saadeh', native_name: 'عين سعادة', district_code: 'JOU', region_code: 'ML', latitude: 33.9200, longitude: 35.6000, timezone: 'Asia/Beirut' },
      { name: 'Mansourieh', native_name: 'المنصورية', district_code: 'JOU', region_code: 'ML', latitude: 33.8800, longitude: 35.6000, timezone: 'Asia/Beirut' },
      { name: 'Hazmieh', native_name: 'الحازمية', district_code: 'JOU', region_code: 'ML', latitude: 33.8700, longitude: 35.5300, timezone: 'Asia/Beirut' },
      { name: 'Baabda', native_name: 'بعبدا', district_code: 'ALE', region_code: 'ML', latitude: 33.8300, longitude: 35.5400, timezone: 'Asia/Beirut' },
      { name: 'Elissar', native_name: 'اليسار', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8700, longitude: 35.4700, timezone: 'Asia/Beirut' },
      { name: 'Zouk Mosbeh', native_name: 'ذوق مصبح', district_code: 'JOU', region_code: 'ML', latitude: 33.9600, longitude: 35.6000, timezone: 'Asia/Beirut' },
      { name: 'Antelias', native_name: 'انطلياس', district_code: 'JOU', region_code: 'ML', latitude: 33.9250, longitude: 35.6100, timezone: 'Asia/Beirut' },
      { name: 'Jal el-Dib', native_name: 'جل الديب', district_code: 'JOU', region_code: 'ML', latitude: 33.9400, longitude: 35.5900, timezone: 'Asia/Beirut' },
      { name: 'Dekwaneh', native_name: 'الدكوانة', district_code: 'JOU', region_code: 'ML', latitude: 33.8900, longitude: 35.5500, timezone: 'Asia/Beirut' },
      { name: 'Haret Hreik', native_name: 'حارة حريك', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8600, longitude: 35.4800, timezone: 'Asia/Beirut' },
      { name: 'Ghobeiry', native_name: 'الغبيري', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8550, longitude: 35.4750, timezone: 'Asia/Beirut' },
      { name: 'Furn el-Chebbak', native_name: 'فرن الشباك', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8650, longitude: 35.5250, timezone: 'Asia/Beirut' },
      { name: 'Sabtieh', native_name: 'سبتية', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8600, longitude: 35.5300, timezone: 'Asia/Beirut' },
      { name: 'Bourj Hammoud', native_name: 'برج حمود', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8850, longitude: 35.5300, timezone: 'Asia/Beirut' },
      { name: 'Dora', native_name: 'الدورة', district_code: 'JOU', region_code: 'ML', latitude: 33.9100, longitude: 35.5500, timezone: 'Asia/Beirut' },
      { name: 'Sin el-Fil', native_name: 'سن الفيل', district_code: 'JOU', region_code: 'ML', latitude: 33.8800, longitude: 35.5500, timezone: 'Asia/Beirut' },
      { name: 'Chiyah', native_name: 'الشياح', district_code: 'BEI-2', region_code: 'BEI', latitude: 33.8500, longitude: 35.5100, timezone: 'Asia/Beirut' },
      { name: 'Choueifat', native_name: 'الشويفات', district_code: 'ALE', region_code: 'ML', latitude: 33.7800, longitude: 35.5700, timezone: 'Asia/Beirut' },
      { name: 'Bhamdoun', native_name: 'بحمدون', district_code: 'ALE', region_code: 'ML', latitude: 33.8167, longitude: 35.6333, timezone: 'Asia/Beirut' },
      { name: 'Sofar', native_name: 'صوفر', district_code: 'ALE', region_code: 'ML', latitude: 33.8333, longitude: 35.7000, timezone: 'Asia/Beirut' },
      { name: 'Zahlé', native_name: 'زحلة', district_code: 'ZAH', region_code: 'BK', latitude: 33.8496, longitude: 35.9040, timezone: 'Asia/Beirut' },
    ];

    const cities: Record<string, { id: string; name: string }> = {};
    for (const c of cityData) {
      const district = districts[c.district_code];
      const existingCity = await tx.cities.findFirst({
        where: {
          country_id: country.id,
          name: c.name,
        },
      });

      const cityData = {
        country_id: country.id,
        region_id: regions[c.region_code].id,
        district_id: district ? district.id : null,
        name: c.name,
        native_name: c.native_name,
        latitude: c.latitude,
        longitude: c.longitude,
        timezone: c.timezone,
        is_active: true,
        sort_order: Object.keys(cities).length + 1,
      };

      const city = existingCity
        ? await tx.cities.update({
            where: { id: existingCity.id },
            data: cityData,
          })
        : await tx.cities.create({
            data: cityData,
          });
      cities[c.name] = { id: city.id, name: city.name };
    }
    console.log(`  Cities: ${Object.keys(cities).length}`);

    const areaData = [
      { name: 'Hamra', city_name: 'Beirut', latitude: 33.8960, longitude: 35.4820, radius_meters: 800, native_name: 'الحمراء' },
      { name: 'Achrafieh', city_name: 'Beirut', latitude: 33.8867, longitude: 35.5083, radius_meters: 1000, native_name: 'الأشرفية' },
      { name: 'Gemmayze', city_name: 'Beirut', latitude: 33.8975, longitude: 35.5135, radius_meters: 600, native_name: 'الجميزة' },
      { name: 'Verdun', city_name: 'Beirut', latitude: 33.8750, longitude: 35.4800, radius_meters: 700, native_name: 'فردان' },
      { name: 'Jounieh Central', city_name: 'Jounieh', latitude: 33.9764, longitude: 35.6231, radius_meters: 1200, native_name: 'وسط جونيه' },
      { name: 'Byblos Old Town', city_name: 'Byblos', latitude: 34.1222, longitude: 35.6494, radius_meters: 1500, native_name: 'مدينة جبيل القديمة' },
      { name: 'Tripoli Central', city_name: 'Tripoli', latitude: 34.4381, longitude: 35.8308, radius_meters: 1500, native_name: 'وسط طرابلس' },
      { name: 'Saida Old', city_name: 'Saida', latitude: 33.5567, longitude: 35.3708, radius_meters: 1000, native_name: 'صيدا القديمة' },
      { name: 'Tyre Coast', city_name: 'Tyre', latitude: 33.2721, longitude: 35.2033, radius_meters: 1500, native_name: 'ساحل صور' },
      { name: 'Zahle Center', city_name: 'Zahle', latitude: 33.8496, longitude: 35.9040, radius_meters: 1200, native_name: 'وسط زحلة' },
      { name: 'Baalbek', city_name: 'Baalbek', latitude: 34.0058, longitude: 36.2181, radius_meters: 2000, native_name: 'بعلبك' },
      { name: 'Badaro', city_name: 'Beirut', latitude: 33.8800, longitude: 35.4950, radius_meters: 700, native_name: 'بدارو' },
      { name: 'Downtown Beirut', city_name: 'Beirut', latitude: 33.8965, longitude: 35.5048, radius_meters: 800, native_name: 'وسط بيروت' },
      { name: 'Ain Mreisseh', city_name: 'Beirut', latitude: 33.9020, longitude: 35.4980, radius_meters: 500, native_name: 'عين المريسة' },
      { name: 'Manara', city_name: 'Beirut', latitude: 33.9000, longitude: 35.4850, radius_meters: 600, native_name: 'المنارة' },
      { name: 'Ramlet al-Baida', city_name: 'Beirut', latitude: 33.8890, longitude: 35.4780, radius_meters: 600, native_name: 'رملة البيضاء' },
      { name: 'Kfarahbeil', city_name: 'Bcharre', latitude: 34.2600, longitude: 35.9600, radius_meters: 1000, native_name: 'كفرحبيل' },
      { name: 'Ain Saadeh', city_name: 'Beirut', latitude: 33.9200, longitude: 35.6000, radius_meters: 900, native_name: 'عين سعادة' },
      { name: 'Mansourieh', city_name: 'Beirut', latitude: 33.8800, longitude: 35.6000, radius_meters: 800, native_name: 'المنصورية' },
      { name: 'Hazmieh', city_name: 'Beirut', latitude: 33.8700, longitude: 35.5300, radius_meters: 700, native_name: 'الحازمية' },
      { name: 'Baabda', city_name: 'Beirut', latitude: 33.8300, longitude: 35.5400, radius_meters: 900, native_name: 'بعبدا' },
      { name: 'Elissar', city_name: 'Beirut', latitude: 33.8700, longitude: 35.4700, radius_meters: 600, native_name: 'اليسار' },
      { name: 'Zouk Mosbeh', city_name: 'Jounieh', latitude: 33.9600, longitude: 35.6000, radius_meters: 800, native_name: 'ذوق مصبح' },
      { name: 'Antelias', city_name: 'Jounieh', latitude: 33.9250, longitude: 35.6100, radius_meters: 700, native_name: 'انطلياس' },
      { name: 'Jal el-Dib', city_name: 'Jounieh', latitude: 33.9400, longitude: 35.5900, radius_meters: 600, native_name: 'جل الديب' },
      { name: 'Dekwaneh', city_name: 'Beirut', latitude: 33.8900, longitude: 35.5500, radius_meters: 600, native_name: 'الدكوانة' },
      { name: 'Haret Hreik', city_name: 'Beirut', latitude: 33.8600, longitude: 35.4800, radius_meters: 700, native_name: 'حارة حريك' },
      { name: 'Ghobeiry', city_name: 'Beirut', latitude: 33.8550, longitude: 35.4750, radius_meters: 500, native_name: 'الغبيري' },
      { name: 'Furn el-Chebbak', city_name: 'Beirut', latitude: 33.8650, longitude: 35.5250, radius_meters: 600, native_name: 'فرن الشباك' },
      { name: 'Sabtieh', city_name: 'Beirut', latitude: 33.8600, longitude: 35.5300, radius_meters: 600, native_name: 'سبتية' },
      { name: 'Bourj Hammoud', city_name: 'Beirut', latitude: 33.8850, longitude: 35.5300, radius_meters: 500, native_name: 'برج حمود' },
      { name: 'Dora', city_name: 'Beirut', latitude: 33.9100, longitude: 35.5500, radius_meters: 700, native_name: 'الدورة' },
      { name: 'Sin el-Fil', city_name: 'Beirut', latitude: 33.8800, longitude: 35.5500, radius_meters: 600, native_name: 'سن الفيل' },
      { name: 'Chiyah', city_name: 'Beirut', latitude: 33.8500, longitude: 35.5100, radius_meters: 500, native_name: 'الشياح' },
      { name: 'Choueifat', city_name: 'Beirut', latitude: 33.7800, longitude: 35.5700, radius_meters: 800, native_name: 'الشويفات' },
      { name: 'Aley', city_name: 'Aley', latitude: 33.8000, longitude: 35.6000, radius_meters: 1000, native_name: 'عاليه' },
      { name: 'Bhamdoun', city_name: 'Broummana', latitude: 33.8167, longitude: 35.6333, radius_meters: 1000, native_name: 'بحمدون' },
      { name: 'Sofar', city_name: 'Broummana', latitude: 33.8333, longitude: 35.7000, radius_meters: 800, native_name: 'صوفر' },
      { name: 'Bikfaya', city_name: 'Bikfaya', latitude: 33.9625, longitude: 35.6236, radius_meters: 900, native_name: 'بكفيا' },
      { name: 'Broummana', city_name: 'Broummana', latitude: 33.9167, longitude: 35.6000, radius_meters: 1000, native_name: 'برمانا' },
      { name: 'Deir el-Qamar', city_name: 'Deir el-Qamar', latitude: 33.5431, longitude: 35.5617, radius_meters: 800, native_name: 'دير القمر' },
    ];

    let areaCount = 0;
    for (const a of areaData) {
      const city = cities[a.city_name];
      if (!city) continue;
      const existingArea = await tx.areas.findFirst({
        where: {
          city_id: city.id,
          name: a.name,
        },
      });

      const areaData = {
        city_id: city.id,
        country_id: country.id,
        name: a.name,
        native_name: a.native_name,
        latitude: a.latitude,
        longitude: a.longitude,
        radius_meters: a.radius_meters,
        is_active: true,
        sort_order: areaCount + 1,
      };

      if (existingArea) {
        await tx.areas.update({
          where: { id: existingArea.id },
          data: areaData,
        });
      } else {
        await tx.areas.create({
          data: areaData,
        });
      }
      areaCount++;
    }
    console.log(`  Areas: ${areaCount}`);
  });

  console.log('=== Lebanon Geography Seeding Complete ===\n');
}
