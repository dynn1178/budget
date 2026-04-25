-- =========================================================
-- 002: 월별 예산 설정 테이블 추가
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- =========================================================

CREATE TABLE IF NOT EXISTS public.budget_monthly_settings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year          integer NOT NULL,
  month         integer NOT NULL CHECK (month >= 1 AND month <= 12),
  budget_amount bigint NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_budget_monthly_user
  ON public.budget_monthly_settings(user_id);

ALTER TABLE public.budget_monthly_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_monthly_settings_owner"
  ON public.budget_monthly_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
