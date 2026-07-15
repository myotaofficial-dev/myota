import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ============================================================
// Database type definitions — mirrors production schema
// ============================================================

export type PropertyStatus = 'draft' | 'published';
export type HeroStyle = 'single' | 'carousel' | 'collage' | 'video';
export type MealPlan = 'EP' | 'CP' | 'MAP' | 'AP';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partially_paid';
export type BookingStatus = 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show';
export type PaymentMode = 'full' | 'partial';
export type BookingSource = 'direct' | 'phone' | 'ota' | 'walkin';
export type DiscountType = 'percent' | 'fixed';
export type TestimonialSource = 'manual' | 'google';
export type PageType = 'blog' | 'restaurant' | 'pool' | 'banquet' | 'activities' | 'custom';
export type CoHostRole = 'super_admin' | 'manager' | 'caretaker';
export type MediaType = 'photo' | 'video';
export type LogType = 'booking' | 'channel' | 'info';
export type PricingType = 'per_head' | 'single_event';

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          name: string;
          status: PropertyStatus;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      hotel_settings: {
        Row: {
          property_id: string;
          name: string;
          subdomain: string;
          custom_domain: string;
          star_rating: number;
          check_in_time: string;
          check_out_time: string;
          phone: string;
          email: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          tagline: string;
          description: string;
          short_description: string | null;
          detailed_description: string | null;
          website_headline: string | null;
          about_title: string | null;
          amenities_title: string | null;
          events_title: string | null;
          rooms_title: string | null;
          reviews_title: string | null;
          gallery_title: string | null;
          addons_title: string | null;
          faqs_title: string | null;
          policies_title: string | null;
          primary_color: string;
          secondary_color: string;
          bg_color: string;
          font_header: string;
          font_body: string;
          logo_url: string;
          favicon_url: string | null;
          google_analytics_id: string;
          facebook_pixel_id: string;
          instagram_handle: string | null;
          google_business_name: string | null;
          hero_style: HeroStyle;
          hero_images: string[];
          hero_video: string;
          general_amenities: string[];
          custom_amenities: string[];
          section_order: string[];
          disabled_sections: string[];
          menu_items_order: string[];
          disabled_menu_items: string[];
          show_events: boolean;
          child_policy_enabled: boolean;
          child_policy_min_age: number;
          child_policy_max_age: number;
          extra_adult_rate: number;
          extra_child_rate: number;
          meal_plan_cp_enabled: boolean;
          meal_plan_cp_adult_rate: number;
          meal_plan_cp_child_rate: number;
          meal_plan_map_enabled: boolean;
          meal_plan_map_adult_rate: number;
          meal_plan_map_child_rate: number;
          meal_plan_ap_enabled: boolean;
          meal_plan_ap_adult_rate: number;
          meal_plan_ap_child_rate: number;
          default_meal_plan: MealPlan;
          cancellation_policy_type: string;
          cancellation_policy_custom_text: string | null;
          non_refundable_discount_amount: number;
          custom_cancellation_policies: Record<string, unknown>[];
          payment_collection_type: PaymentMode;
          payment_collection_percent: number;
          current_template: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['hotel_settings']['Row']> & { property_id: string };
        Update: Partial<Database['public']['Tables']['hotel_settings']['Row']>;
      };
      room_categories: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          description: string;
          size_sqft: number;
          bed_type: string;
          capacity_adults: number;
          capacity_children: number;
          min_occupancy: number;
          base_occupancy: number;
          base_price: number;
          price_tiers: Record<string, number>;
          total_inventory: number;
          beds: Record<string, number>;
          extra_beds: Record<string, number>;
          amenities: string[];
          photos: string[];
          inventory_overrides: Record<string, number>;
          rate_overrides: Record<string, Record<string, number>>;
          cancellation_policy_overrides: Record<string, string>;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['room_categories']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['room_categories']['Insert']>;
      };
      pricing_overrides: {
        Row: {
          id: string;
          room_id: string;
          property_id: string;
          date: string;
          price: number;
          is_blocked: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pricing_overrides']['Row'], 'id' | 'created_at'>;
        Update: Partial<Pick<Database['public']['Tables']['pricing_overrides']['Row'], 'price' | 'is_blocked'>>;
      };
      bookings: {
        Row: {
          id: string;
          property_id: string;
          room_id: string | null;
          room_name: string;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          check_in: string;
          check_out: string;
          nights: number;
          adults: number;
          children: number;
          base_price: number;
          addon_total: number;
          meal_plan_total: number;
          discount_amount: number;
          total_price: number;
          payment_status: PaymentStatus;
          payment_mode: PaymentMode;
          amount_paid: number;
          booking_status: BookingStatus;
          meal_plan: string;
          addons: string[];
          coupon_code: string | null;
          cancellation_policy_applied: string | null;
          special_requests: string | null;
          source: BookingSource;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'nights' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      addons: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          description: string;
          price: number;
          image: string | null;
          pricing_type: PricingType;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['addons']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['addons']['Insert']>;
      };
      coupons: {
        Row: {
          id: string;
          property_id: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          min_booking_amount: number;
          max_discount_amount: number | null;
          valid_from: string | null;
          valid_until: string | null;
          max_uses: number | null;
          use_count: number;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['coupons']['Row'], 'use_count' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
      };
      testimonials: {
        Row: {
          id: string;
          property_id: string;
          author: string;
          content: string;
          rating: number;
          stay_date: string | null;
          avatar_url: string | null;
          source: TestimonialSource;
          is_approved: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['testimonials']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['testimonials']['Insert']>;
      };
      faqs: {
        Row: {
          id: string;
          property_id: string;
          question: string;
          answer: string;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['faqs']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['faqs']['Insert']>;
      };
      policies: {
        Row: {
          id: string;
          property_id: string;
          title: string;
          description: string;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['policies']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['policies']['Insert']>;
      };
      custom_pages: {
        Row: {
          id: string;
          property_id: string;
          title: string;
          slug: string;
          content: string;
          active: boolean;
          page_type: PageType;
          banner_image: string | null;
          tagline: string | null;
          restaurant_menu: Record<string, unknown>[];
          banquet_capacity: number | null;
          banquet_features: string[];
          blog_posts: Record<string, unknown>[];
          activities_list: Record<string, unknown>[];
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['custom_pages']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['custom_pages']['Insert']>;
      };
      guest_events: {
        Row: {
          id: string;
          property_id: string;
          title: string;
          category: string;
          description: string;
          image: string;
          from_date: string;
          to_date: string;
          time: string;
          price: number;
          capacity: number;
          is_active: boolean;
          display_order: number;
          created_at: string;
          about_text: string | null;
        };
        Insert: Omit<Database['public']['Tables']['guest_events']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['guest_events']['Insert']>;
      };
      co_hosts: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          phone: string;
          role: CoHostRole;
          can_receive_calls: boolean;
          can_accept_bookings: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['co_hosts']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['co_hosts']['Insert']>;
      };
      media_library: {
        Row: {
          id: string;
          property_id: string;
          url: string;
          media_type: MediaType;
          tags: string[];
          is_hero: boolean;
          file_name: string | null;
          file_size_bytes: number | null;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['media_library']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['media_library']['Insert']>;
      };
      guest_messages: {
        Row: {
          id: string;
          property_id: string;
          sender_name: string;
          sender_email: string;
          sender_phone: string;
          subject: string;
          message: string;
          sent_date: string;
          is_read: boolean;
          archived: boolean;
          replied_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['guest_messages']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['guest_messages']['Insert']>;
      };
      event_logs: {
        Row: {
          id: string;
          property_id: string;
          title: string;
          description: string;
          log_type: LogType;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['event_logs']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['event_logs']['Insert']>;
      };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
