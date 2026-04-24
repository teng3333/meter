DO $$
DECLARE
  site_kiyohara UUID;
  site_takanezawa UUID;
  site_hanaoka UUID;
  site_dummy UUID;
BEGIN
  -- 既存のデータをすべて削除（※関連するメーターや過去の記録もすべてリセットされます）
  DELETE FROM public.sites;

  -- 1. 拠点の作成
  INSERT INTO public.sites (name, address) VALUES ('清原工場', '栃木県 宇都宮市') RETURNING id INTO site_kiyohara;
  INSERT INTO public.sites (name, address) VALUES ('高根沢工場', '栃木県 塩谷郡高根沢町') RETURNING id INTO site_takanezawa;
  INSERT INTO public.sites (name, address) VALUES ('花岡工場', '長野県 岡谷市') RETURNING id INTO site_hanaoka;
  INSERT INTO public.sites (name, address) VALUES ('練習用ダミー工場', 'テスト用') RETURNING id INTO site_dummy;

  -- 2. 清原工場のメーター
  INSERT INTO public.meters (site_id, name, type) VALUES
  (site_kiyohara, '給水（上水）', 'water_in'),
  (site_kiyohara, '給水（工水）', 'water_in'),
  (site_kiyohara, '排水', 'water_out');

  -- 3. 高根沢工場のメーター
  INSERT INTO public.meters (site_id, name, type) VALUES
  (site_takanezawa, '給水（上水）', 'water_in'),
  (site_takanezawa, '給水（井水）1号', 'water_in'),
  (site_takanezawa, '給水（井水）2号', 'water_in'),
  (site_takanezawa, '給水（井水）3号', 'water_in'),
  (site_takanezawa, '給水（井水）4号', 'water_in'),
  (site_takanezawa, '給水（井水）5号', 'water_in'),
  (site_takanezawa, '給水（井水）6号', 'water_in'),
  (site_takanezawa, '給水（井水）7号', 'water_in');

  -- 4. 花岡工場のメーター
  INSERT INTO public.meters (site_id, name, type) VALUES
  (site_hanaoka, '給水（上水）', 'water_in'),
  (site_hanaoka, '排水（浄化槽）', 'water_out'),
  (site_hanaoka, '排水（化学処理）', 'water_out');

  -- 5. 練習用ダミー工場のメーター
  INSERT INTO public.meters (site_id, name, type) VALUES
  (site_dummy, '給水（清原）', 'water_in'),
  (site_dummy, '排水（清原）', 'water_out'),
  (site_dummy, '給水（高根沢）', 'water_in'),
  (site_dummy, '排水（高根沢）', 'water_out'),
  (site_dummy, '給水（花岡）', 'water_in'),
  (site_dummy, '排水（花岡）', 'water_out');

END $$;
