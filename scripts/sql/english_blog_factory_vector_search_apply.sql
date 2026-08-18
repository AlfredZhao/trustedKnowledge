-- Oracle AI Vector Search rollout for T_ENGLISH and AI_BLOG_FACTORY.
-- Run this script before deploying the application changes.
-- VECTOR(*, *) deliberately accepts the exact BGE_BASE vector shape used by T_HISTORY.

prompt === 1) Add vector state columns (safe to rerun) ===

begin
  execute immediate 'alter table t_english add (v vector(*, *), v_needs_update number(1) default 1 not null constraint t_english_v_needs_update_ck check (v_needs_update in (0, 1)))';
exception
  when others then
    if sqlcode != -1430 and sqlcode != -2264 then raise; end if;
end;
/

begin
  execute immediate 'alter table ai_blog_factory add (v vector(*, *), v_needs_update number(1) default 1 not null constraint ai_blog_factory_v_needs_update_ck check (v_needs_update in (0, 1)))';
exception
  when others then
    if sqlcode != -1430 and sqlcode != -2264 then raise; end if;
end;
/

prompt === 2) Mark the initial refresh scope ===

update t_english
set    v = null,
       v_needs_update = case when full_script is null then 0 else 1 end
where  v is null
   or  v_needs_update is null;

update ai_blog_factory
set    v = null,
       v_needs_update = case when task_content is null then 0 else 1 end
where  v is null
   or  v_needs_update is null;

commit;

-- After deploying the package script, populate pending rows with:
-- begin
--   pkg_ai_assistant.refresh_english_vectors;
--   pkg_ai_assistant.refresh_blog_factory_vectors;
-- end;
-- /
