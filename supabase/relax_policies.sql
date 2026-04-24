-- 自社運用向けアクセス緩和ポリシー
-- ロールに関わらず、ログイン済み（authenticated）のユーザー全員に対して、
-- 拠点（sites）とメーター（meters）の閲覧を許可します。

-- sites に対する閲覧許可
DROP POLICY IF EXISTS "Authenticated users can select sites" ON public.sites;
CREATE POLICY "Authenticated users can select sites"
ON public.sites
FOR SELECT
TO authenticated
USING (true);

-- meters に対する閲覧許可
DROP POLICY IF EXISTS "Authenticated users can select meters" ON public.meters;
CREATE POLICY "Authenticated users can select meters"
ON public.meters
FOR SELECT
TO authenticated
USING (true);
