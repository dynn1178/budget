-- =========================================================
-- 003: budget_monthly_settings에 카테고리별 예산 컬럼 추가
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- =========================================================

ALTER TABLE public.budget_monthly_settings
  ADD COLUMN IF NOT EXISTS category_budgets JSONB NOT NULL DEFAULT '{}';
