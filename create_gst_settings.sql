CREATE TABLE IF NOT EXISTS public.gst_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  room_slabs jsonb NOT NULL DEFAULT '[
    {"min": 0, "max": 1000, "rate": 0},
    {"min": 1001, "max": 7500, "rate": 5},
    {"min": 7501, "max": 99999999, "rate": 18}
  ]'::jsonb,
  addons_rate numeric NOT NULL DEFAULT 18,
  events_rate numeric NOT NULL DEFAULT 18,
  meal_plans_rate numeric NOT NULL DEFAULT 18,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON public.gst_settings;
DROP POLICY IF EXISTS "Allow public insert" ON public.gst_settings;
DROP POLICY IF EXISTS "Allow public update" ON public.gst_settings;
DROP POLICY IF EXISTS "Allow public delete" ON public.gst_settings;

-- Create policies to match other tables (public anon access for easy sync)
CREATE POLICY "Allow public read" ON public.gst_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON public.gst_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.gst_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.gst_settings FOR DELETE TO anon USING (true);
