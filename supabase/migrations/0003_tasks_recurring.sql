-- =====================================================================
--  Home OS — ponavljajuci zadaci
--  Pokreni u Supabase SQL Editoru NAKON 0001 i 0002
-- =====================================================================

alter table tasks add column if not exists recurring text; -- 'daily' | 'weekly' | 'monthly' | null
