-- profiles テーブル (Supabase Auth と連動)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user', -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sites テーブル (拠点)
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- meters テーブル (メーター)
CREATE TABLE IF NOT EXISTS public.meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'water_in' | 'water_out'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_sites テーブル (ユーザーと拠点の紐付け)
CREATE TABLE IF NOT EXISTS public.user_sites (
  user_id UUID NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites ON DELETE CASCADE,
  PRIMARY KEY (user_id, site_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- meter_readings テーブル (月次記録)
CREATE TABLE IF NOT EXISTS public.meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES public.meters ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles ON DELETE SET NULL,
  reading_value NUMERIC NOT NULL,
  prev_reading_id UUID REFERENCES public.meter_readings ON DELETE SET NULL,
  prev_value NUMERIC,
  usage_value NUMERIC,
  is_anomaly BOOLEAN DEFAULT false,
  image_url TEXT,
  image_path TEXT,
  read_at TIMESTAMPTZ NOT NULL,
  is_manual BOOLEAN DEFAULT false,
  ocr_confidence FLOAT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

-- プロフィール作成トリガー (Auth サインアップ時)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ストレージバケットの作成 (SQL経由では難しい場合があるためコンソール推奨ですが、ポリシーは記述可能)
-- bucket: meter-photos
