-- 既存のmeter_readings用ポリシーがあれば一旦削除（クリーンアップ）
DROP POLICY IF EXISTS "Authenticated users can select meter_readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Users can insert their own meter_readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Admins can update meter_readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Admins can delete meter_readings" ON public.meter_readings;

-- RLSを強制的に有効化
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

-- 1. 閲覧 (SELECT) の許可
-- アプリにログインしている（認証済み）ユーザーなら、全ての履歴を閲覧できる。
CREATE POLICY "Authenticated users can select meter_readings"
ON public.meter_readings
FOR SELECT
TO authenticated
USING (true);

-- 2. 記録の追加 (INSERT) の許可
-- アプリにログインしているユーザーは、自分自身の記録のみを追加できる。
-- （他人のアカウントで記録を偽装できないようにする）
CREATE POLICY "Users can insert their own meter_readings"
ON public.meter_readings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. 記録の修正 (UPDATE) の許可
-- ログインしているユーザーのアカウントが 'admin'（管理者）である場合のみ修正を許可。
-- （改竄を防止する最重要箇所）
CREATE POLICY "Admins can update meter_readings"
ON public.meter_readings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. 記録の削除 (DELETE) の許可
-- 管理者のみ誤って登録された履歴を削除できる。
CREATE POLICY "Admins can delete meter_readings"
ON public.meter_readings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
