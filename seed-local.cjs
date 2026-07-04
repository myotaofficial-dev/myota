const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:UpKqbIpxImIGPomr@db.yahlplnvhwvnlumteftn.supabase.co:5432/postgres';

async function main() {
  console.log('Reading localStorage.json...');
  let data;
  try {
    const raw = fs.readFileSync('./localStorage.json', 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading localStorage.json. Make sure the file exists and is valid JSON.', err.message);
    process.exit(1);
  }

  // Helper parsing functions
  const tryParseJSON = (key, fallback) => {
    if (!data[key]) return fallback;
    try {
      return JSON.parse(data[key]);
    } catch {
      try {
        // Already parsed
        return data[key];
      } catch {
        return fallback;
      }
    }
  };

  const activePropertyId = data.activePropertyId || 'prop-1';
  console.log('Active Property ID:', activePropertyId);

  const propertiesList = tryParseJSON('propertiesList', [
    { id: 'prop-1', name: 'Sri K Residency', status: 'Published' },
    { id: 'prop-2', name: 'The Grandlake Resorts', status: 'Draft' }
  ]);

  const hotelInfo = tryParseJSON('hotelInfo', {});
  const rooms = tryParseJSON('rooms', []);
  const addons = tryParseJSON('addons', []);
  const coupons = tryParseJSON('coupons', []);
  const testimonials = tryParseJSON('testimonials', []);
  const faqs = tryParseJSON('faqs', []);
  const policies = tryParseJSON('policies', []);
  const customPages = tryParseJSON('customPages', []);
  const messages = tryParseJSON('messages', []);
  const events = tryParseJSON('events', []);
  const managedPhotos = tryParseJSON('managedPhotos', []);
  const managedVideos = tryParseJSON('managedVideos', []);

  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  try {
    await client.query('BEGIN');

    // 1. Seed properties
    console.log('Seeding properties...');
    for (const prop of propertiesList) {
      await client.query(`
        INSERT INTO properties (id, name, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
      `, [prop.id, prop.name, (prop.status || 'draft').toLowerCase()]);
    }

    // 2. Seed hotel_settings
    console.log('Seeding hotel_settings...');
    if (hotelInfo && Object.keys(hotelInfo).length > 0) {
      await client.query(`
        INSERT INTO hotel_settings (
          property_id, name, subdomain, custom_domain, star_rating, check_in_time, check_out_time,
          phone, email, address, tagline, description, short_description, detailed_description,
          website_headline, primary_color, secondary_color, bg_color, font_header, font_body,
          logo_url, google_analytics_id, facebook_pixel_id, hero_style, hero_images, hero_video,
          general_amenities, custom_amenities, section_order, disabled_sections,
          menu_items_order, disabled_menu_items, show_events, child_policy_enabled,
          child_policy_min_age, child_policy_max_age, extra_adult_rate, extra_child_rate,
          meal_plan_cp_enabled, meal_plan_cp_adult_rate, meal_plan_cp_child_rate,
          meal_plan_map_enabled, meal_plan_map_adult_rate, meal_plan_map_child_rate,
          meal_plan_ap_enabled, meal_plan_ap_adult_rate, meal_plan_ap_child_rate,
          default_meal_plan, cancellation_policy_type, cancellation_policy_custom_text,
          non_refundable_discount_amount, custom_cancellation_policies,
          payment_collection_type, payment_collection_percent, current_template
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
        ) ON CONFLICT (property_id) DO UPDATE SET
          name = EXCLUDED.name, subdomain = EXCLUDED.subdomain, custom_domain = EXCLUDED.custom_domain,
          star_rating = EXCLUDED.star_rating, check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time,
          phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, tagline = EXCLUDED.tagline,
          description = EXCLUDED.description, short_description = EXCLUDED.short_description,
          detailed_description = EXCLUDED.detailed_description, website_headline = EXCLUDED.website_headline,
          primary_color = EXCLUDED.primary_color, secondary_color = EXCLUDED.secondary_color,
          bg_color = EXCLUDED.bg_color, font_header = EXCLUDED.font_header, font_body = EXCLUDED.font_body,
          logo_url = EXCLUDED.logo_url, google_analytics_id = EXCLUDED.google_analytics_id,
          facebook_pixel_id = EXCLUDED.facebook_pixel_id, hero_style = EXCLUDED.hero_style,
          hero_images = EXCLUDED.hero_images, hero_video = EXCLUDED.hero_video,
          general_amenities = EXCLUDED.general_amenities, custom_amenities = EXCLUDED.custom_amenities,
          section_order = EXCLUDED.section_order, disabled_sections = EXCLUDED.disabled_sections,
          menu_items_order = EXCLUDED.menu_items_order, disabled_menu_items = EXCLUDED.disabled_menu_items,
          show_events = EXCLUDED.show_events, child_policy_enabled = EXCLUDED.child_policy_enabled,
          child_policy_min_age = EXCLUDED.child_policy_min_age, child_policy_max_age = EXCLUDED.child_policy_max_age,
          extra_adult_rate = EXCLUDED.extra_adult_rate, extra_child_rate = EXCLUDED.extra_child_rate,
          meal_plan_cp_enabled = EXCLUDED.meal_plan_cp_enabled, meal_plan_cp_adult_rate = EXCLUDED.meal_plan_cp_adult_rate,
          meal_plan_cp_child_rate = EXCLUDED.meal_plan_cp_child_rate, meal_plan_map_enabled = EXCLUDED.meal_plan_map_enabled,
          meal_plan_map_adult_rate = EXCLUDED.meal_plan_map_adult_rate, meal_plan_map_child_rate = EXCLUDED.meal_plan_map_child_rate,
          meal_plan_ap_enabled = EXCLUDED.meal_plan_ap_enabled, meal_plan_ap_adult_rate = EXCLUDED.meal_plan_ap_adult_rate,
          meal_plan_ap_child_rate = EXCLUDED.meal_plan_ap_child_rate, default_meal_plan = EXCLUDED.default_meal_plan,
          cancellation_policy_type = EXCLUDED.cancellation_policy_type, cancellation_policy_custom_text = EXCLUDED.cancellation_policy_custom_text,
          non_refundable_discount_amount = EXCLUDED.non_refundable_discount_amount, custom_cancellation_policies = EXCLUDED.custom_cancellation_policies,
          payment_collection_type = EXCLUDED.payment_collection_type, payment_collection_percent = EXCLUDED.payment_collection_percent,
          current_template = EXCLUDED.current_template, updated_at = NOW()
      `, [
        activePropertyId,
        hotelInfo.name || '',
        hotelInfo.subdomain || '',
        hotelInfo.customDomain || '',
        hotelInfo.starRating || 3,
        hotelInfo.checkInTime || '14:00',
        hotelInfo.checkOutTime || '11:00',
        hotelInfo.phone || '',
        hotelInfo.email || '',
        hotelInfo.address || '',
        hotelInfo.tagline || '',
        hotelInfo.description || '',
        hotelInfo.shortDescription || null,
        hotelInfo.detailedDescription || null,
        hotelInfo.websiteHeadline || null,
        hotelInfo.primaryColor || '#0284c7',
        hotelInfo.secondaryColor || '#1a1a1a',
        hotelInfo.bgColor || '#FFFFFF',
        hotelInfo.fontHeader || 'Noto Serif',
        hotelInfo.fontBody || 'Mulish',
        hotelInfo.logoUrl || '',
        hotelInfo.googleAnalyticsId || '',
        hotelInfo.facebookPixelId || '',
        hotelInfo.heroStyle || 'single',
        hotelInfo.heroImages || [],
        hotelInfo.heroVideo || '',
        hotelInfo.generalAmenities || [],
        hotelInfo.customAmenities || [],
        JSON.stringify(hotelInfo.sectionOrder || []),
        JSON.stringify(hotelInfo.disabledSections || []),
        JSON.stringify(hotelInfo.menuItemsOrder || []),
        JSON.stringify(hotelInfo.disabledMenuItems || []),
        hotelInfo.showEvents !== false,
        hotelInfo.childPolicyEnabled || false,
        hotelInfo.childPolicyMinAge || 5,
        hotelInfo.childPolicyMaxAge || 12,
        hotelInfo.extraAdultRate || 0,
        hotelInfo.extraChildRate || 0,
        hotelInfo.mealPlanCpEnabled || false,
        hotelInfo.mealPlanCpAdultRate || 0,
        hotelInfo.mealPlanCpChildRate || 0,
        hotelInfo.mealPlanMapEnabled || false,
        hotelInfo.mealPlanMapAdultRate || 0,
        hotelInfo.mealPlanMapChildRate || 0,
        hotelInfo.mealPlanApEnabled || false,
        hotelInfo.mealPlanApAdultRate || 0,
        hotelInfo.mealPlanApChildRate || 0,
        hotelInfo.defaultMealPlan || 'EP',
        hotelInfo.cancellationPolicyType || '2d',
        hotelInfo.cancellationPolicyCustomText || null,
        hotelInfo.nonRefundableDiscountAmount || 0,
        JSON.stringify(hotelInfo.customCancellationPolicies || []),
        hotelInfo.paymentCollectionType || 'partial',
        hotelInfo.paymentCollectionPercent || 50,
        hotelInfo.currentTemplate || 'organic'
      ]);
    }

    // 3. Seed room_categories
    console.log('Seeding room_categories...');
    for (const r of rooms) {
      await client.query(`
        INSERT INTO room_categories (
          id, property_id, name, description, size_sqft, bed_type,
          capacity_adults, capacity_children, min_occupancy, base_occupancy,
          base_price, price_tiers, total_inventory, beds, extra_beds,
          amenities, photos, inventory_overrides, rate_overrides,
          cancellation_policy_overrides, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, description = EXCLUDED.description, size_sqft = EXCLUDED.size_sqft,
          bed_type = EXCLUDED.bed_type, capacity_adults = EXCLUDED.capacity_adults,
          capacity_children = EXCLUDED.capacity_children, min_occupancy = EXCLUDED.min_occupancy,
          base_occupancy = EXCLUDED.base_occupancy, base_price = EXCLUDED.base_price,
          price_tiers = EXCLUDED.price_tiers, total_inventory = EXCLUDED.total_inventory,
          beds = EXCLUDED.beds, extra_beds = EXCLUDED.extra_beds, amenities = EXCLUDED.amenities,
          photos = EXCLUDED.photos, inventory_overrides = EXCLUDED.inventory_overrides,
          rate_overrides = EXCLUDED.rate_overrides, cancellation_policy_overrides = EXCLUDED.cancellation_policy_overrides,
          is_active = EXCLUDED.is_active, updated_at = NOW()
      `, [
        r.id, activePropertyId, r.name, r.description || '', r.sizeSqft || 0, r.bedType || '',
        r.capacityAdults || 2, r.capacityChildren || 0, r.min_occupancy || 1, r.base_occupancy || r.capacityAdults,
        r.basePrice || 0, JSON.stringify(r.price_tiers || {}), r.totalInventory || 1,
        JSON.stringify(r.beds || {}), JSON.stringify(r.extra_beds || {}),
        r.amenities || [], r.photos || [], JSON.stringify(r.inventory_overrides || {}),
        JSON.stringify(r.rate_overrides || {}), JSON.stringify(r.cancellation_policy_overrides || {}),
        r.is_active !== false
      ]);
    }

    // 4. Seed addons
    console.log('Seeding addons...');
    for (const a of addons) {
      await client.query(`
        INSERT INTO addons (id, property_id, name, description, price, image, pricing_type, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
          image = EXCLUDED.image, pricing_type = EXCLUDED.pricing_type, is_active = EXCLUDED.is_active
      `, [a.id, activePropertyId, a.name, a.description || '', a.price || 0, a.image || null, a.pricingType || 'single_event', true]);
    }

    // 5. Seed coupons
    console.log('Seeding coupons...');
    for (const c of coupons) {
      await client.query(`
        INSERT INTO coupons (id, property_id, code, discount_type, discount_value, active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code, discount_type = EXCLUDED.discount_type,
          discount_value = EXCLUDED.discount_value, active = EXCLUDED.active
      `, [c.id, activePropertyId, c.code, c.discountType, c.discountValue, c.active !== false]);
    }

    // 6. Seed testimonials
    console.log('Seeding testimonials...');
    for (const t of testimonials) {
      await client.query(`
        INSERT INTO testimonials (id, property_id, author, content, rating, stay_date, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          author = EXCLUDED.author, content = EXCLUDED.content, rating = EXCLUDED.rating,
          stay_date = EXCLUDED.stay_date, avatar_url = EXCLUDED.avatar_url
      `, [t.id, activePropertyId, t.author, t.content, t.rating || 5, t.stayDate || null, t.avatarUrl || null]);
    }

    // 7. Seed faqs
    console.log('Seeding faqs...');
    for (const f of faqs) {
      await client.query(`
        INSERT INTO faqs (id, property_id, question, answer)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, answer = EXCLUDED.answer
      `, [f.id, activePropertyId, f.question, f.answer]);
    }

    // 8. Seed policies
    console.log('Seeding policies...');
    for (const p of policies) {
      await client.query(`
        INSERT INTO policies (id, property_id, title, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
      `, [p.id, activePropertyId, p.title, p.description]);
    }

    // 9. Seed custom_pages
    console.log('Seeding custom_pages...');
    for (const p of customPages) {
      await client.query(`
        INSERT INTO custom_pages (
          id, property_id, title, slug, content, active, page_type, banner_image, tagline,
          restaurant_menu, banquet_capacity, banquet_features, blog_posts, activities_list
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, slug = EXCLUDED.slug, content = EXCLUDED.content, active = EXCLUDED.active,
          page_type = EXCLUDED.page_type, banner_image = EXCLUDED.banner_image, tagline = EXCLUDED.tagline,
          restaurant_menu = EXCLUDED.restaurant_menu, banquet_capacity = EXCLUDED.banquet_capacity,
          banquet_features = EXCLUDED.banquet_features, blog_posts = EXCLUDED.blog_posts,
          activities_list = EXCLUDED.activities_list, updated_at = NOW()
      `, [
        p.id, activePropertyId, p.title, p.slug, p.content || '', p.active !== false, p.type || 'custom',
        p.bannerImage || null, p.tagline || null, JSON.stringify(p.restaurantMenu || []),
        p.banquetCapacity || null, p.banquetFeatures || [], JSON.stringify(p.blogPosts || []), JSON.stringify(p.activitiesList || [])
      ]);
    }

    // 10. Seed media library
    console.log('Seeding media_library...');
    const mediaItems = [
      ...managedPhotos.map(p => ({ id: p.id, url: p.url, media_type: 'photo', tags: p.tags || [], is_hero: p.isHero || false })),
      ...managedVideos.map(v => ({ id: v.id, url: v.url, media_type: 'video', tags: v.tags || [], is_hero: v.isHero || false }))
    ];
    for (const m of mediaItems) {
      await client.query(`
        INSERT INTO media_library (id, property_id, url, media_type, tags, is_hero)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          url = EXCLUDED.url, media_type = EXCLUDED.media_type, tags = EXCLUDED.tags, is_hero = EXCLUDED.is_hero
      `, [m.id, activePropertyId, m.url, m.media_type, m.tags, m.is_hero]);
    }

    // 11. Seed contact messages
    console.log('Seeding guest_messages...');
    for (const m of messages) {
      await client.query(`
        INSERT INTO guest_messages (id, property_id, sender_name, sender_email, sender_phone, subject, message, sent_date, is_read, archived)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          sender_name = EXCLUDED.sender_name, sender_email = EXCLUDED.sender_email, sender_phone = EXCLUDED.sender_phone,
          subject = EXCLUDED.subject, message = EXCLUDED.message, is_read = EXCLUDED.is_read, archived = EXCLUDED.archived
      `, [m.id, activePropertyId, m.senderName, m.senderEmail, m.senderPhone || '', m.subject || '', m.message, m.date || new Date().toISOString().slice(0,10), m.read || false, false]);
    }

    // 12. Seed event logs
    console.log('Seeding event_logs...');
    for (const e of events) {
      await client.query(`
        INSERT INTO event_logs (id, property_id, title, description, log_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [e.id, activePropertyId, e.title, e.description || '', e.type || 'info']);
    }

    await client.query('COMMIT');
    console.log('🎉 Seeding successfully completed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during transaction seeding:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
