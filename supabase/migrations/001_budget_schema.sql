-- =========================================================
-- WhereDidItGo — Budget App Schema
-- 기존 kuan-reads/kuanlink 프로젝트와 동일한 Supabase 인스턴스
-- 실행: Supabase Dashboard > SQL Editor 에서 순서대로 실행
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1. 지출 카테고리 (사용자별)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  icon          text NOT NULL DEFAULT '📦',
  color         text NOT NULL DEFAULT '#9A9088',
  budget_amount bigint NOT NULL DEFAULT 0,  -- 월 예산 (원)
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_user ON public.budget_categories(user_id);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_categories_owner" ON public.budget_categories
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 2. 지출 내역 (트랜잭션)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_transactions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  merchant      text NOT NULL DEFAULT '',
  amount        bigint NOT NULL DEFAULT 0,  -- 원 단위
  account       text NOT NULL DEFAULT '',   -- 결제 수단
  memo          text NOT NULL DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_tx_user_date ON public.budget_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_budget_tx_category ON public.budget_transactions(category_id);

ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_tx_owner" ON public.budget_transactions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3. 자산 / 부채
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_assets (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  icon          text NOT NULL DEFAULT '🏦',
  amount        bigint NOT NULL DEFAULT 0,  -- 자산은 양수, 부채는 음수
  asset_type    text NOT NULL DEFAULT 'asset' CHECK (asset_type IN ('asset', 'liability')),
  note          text NOT NULL DEFAULT '',
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_assets_user ON public.budget_assets(user_id);

ALTER TABLE public.budget_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_assets_owner" ON public.budget_assets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 4. 정기 지출
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_recurring (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  icon            text NOT NULL DEFAULT '🔁',
  amount          bigint NOT NULL DEFAULT 0,
  category_name   text NOT NULL DEFAULT '',
  account         text NOT NULL DEFAULT '',
  cycle           text NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('daily','weekly','monthly','yearly')),
  day_of_month    int NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31),
  active          boolean NOT NULL DEFAULT true,
  memo            text NOT NULL DEFAULT '',
  last_run_date   date,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_recurring_user ON public.budget_recurring(user_id);

ALTER TABLE public.budget_recurring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_recurring_owner" ON public.budget_recurring
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 5. 사용자 설정 (테마·폰트·예산 등)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_settings (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_budget  bigint NOT NULL DEFAULT 2500000,
  theme           text NOT NULL DEFAULT 'light',
  accent          text NOT NULL DEFAULT 'teal',
  font            text NOT NULL DEFAULT 'pretendard',
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_settings_owner" ON public.budget_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 6. 가족 공유 그룹
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_family_groups (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '우리 가족',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.budget_family_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_family_groups_read" ON public.budget_family_groups
  FOR SELECT USING (
    auth.uid() = owner_id OR
    auth.uid() IN (SELECT user_id FROM public.budget_family_members WHERE group_id = id)
  );
CREATE POLICY "budget_family_groups_owner" ON public.budget_family_groups
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =========================================================
-- 7. 가족 공유 멤버
-- =========================================================
CREATE TABLE IF NOT EXISTS public.budget_family_members (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    uuid NOT NULL REFERENCES public.budget_family_groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','viewer')),
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_family_members_group ON public.budget_family_members(group_id);
CREATE INDEX IF NOT EXISTS idx_budget_family_members_user  ON public.budget_family_members(user_id);

ALTER TABLE public.budget_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_family_members_read" ON public.budget_family_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT owner_id FROM public.budget_family_groups WHERE id = group_id)
  );
CREATE POLICY "budget_family_members_owner" ON public.budget_family_members
  FOR ALL USING (
    auth.uid() IN (SELECT owner_id FROM public.budget_family_groups WHERE id = group_id)
  );

-- =========================================================
-- 8. 신규 유저 기본 데이터 자동 생성 함수
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_budget_user()
RETURNS trigger AS $$
BEGIN
  -- 기본 설정 생성
  INSERT INTO public.budget_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  -- 기본 카테고리 생성
  INSERT INTO public.budget_categories (user_id, name, icon, color, budget_amount, sort_order) VALUES
    (NEW.id, '식비',   '🍜', '#C8622A', 500000, 1),
    (NEW.id, '교통',   '🚇', '#2E5FA8', 200000, 2),
    (NEW.id, '쇼핑',   '🛍️', '#B03A6E', 300000, 3),
    (NEW.id, '주거',   '🏠', '#3D8C82', 700000, 4),
    (NEW.id, '의료',   '💊', '#7B5EA7', 100000, 5),
    (NEW.id, '여가',   '🎬', '#C47D20', 200000, 6),
    (NEW.id, '기타',   '📦', '#5C7A94', 500000, 7)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거: 새 유저 가입 시 자동 실행
DROP TRIGGER IF EXISTS on_auth_user_created_budget ON auth.users;
CREATE TRIGGER on_auth_user_created_budget
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_budget_user();

-- =========================================================
-- 9. 월별 지출 집계 뷰
-- =========================================================
CREATE OR REPLACE VIEW public.budget_monthly_summary AS
SELECT
  t.user_id,
  DATE_TRUNC('month', t.date) AS month,
  SUM(t.amount) AS total_spent,
  COUNT(*) AS transaction_count
FROM public.budget_transactions t
GROUP BY t.user_id, DATE_TRUNC('month', t.date);

-- =========================================================
-- 10. 카테고리별 월 지출 집계 뷰
-- =========================================================
CREATE OR REPLACE VIEW public.budget_category_monthly AS
SELECT
  t.user_id,
  t.category_id,
  DATE_TRUNC('month', t.date) AS month,
  SUM(t.amount) AS spent,
  COUNT(*) AS count
FROM public.budget_transactions t
WHERE t.category_id IS NOT NULL
GROUP BY t.user_id, t.category_id, DATE_TRUNC('month', t.date);
