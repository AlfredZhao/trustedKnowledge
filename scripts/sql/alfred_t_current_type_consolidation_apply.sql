-- Alfred-only formal migration for T_CURRENT type consolidation.
-- Scope:
-- - Backup Alfred rows first.
-- - Keep one row per target type by furthest week/day progress.
-- - Update keeper rows into Work / Study / Life / Info.
-- - Merge contributor content into the keeper content with source markers.
-- - Delete Alfred contributor rows after keeper update.
-- - Show post-migration checks before you decide to COMMIT or ROLLBACK.
--
-- Safety:
-- - This script only targets Alfred.
-- - It uses a dedicated backup table name. Change it before rerunning.
-- - COMMIT is intentionally left manual at the end.
--
-- Suggested execution:
--   sql /nolog
--   connect <user>/<password>@<dsn>
--   @scripts/sql/alfred_t_current_type_consolidation_apply.sql

whenever sqlerror exit failure rollback

define target_username = 'Alfred'

column generated_backup_table new_value backup_table noprint
select 'T_CURRENT_BAK_ALFRED_' || to_char(systimestamp, 'YYYYMMDD_HH24MISS') as generated_backup_table
from dual;

prompt === 0) Create backup table for Alfred rows ===
prompt Backup table name: &&backup_table

create table &&backup_table as
select c.*
from t_current c
left join tk_users u
    on u.user_id = c.user_id
where lower(coalesce(u.username, c.username)) = lower('&target_username');

prompt === 1) Backup row count ===

select count(*) as backup_rows
from &&backup_table;

prompt === 2) Update keeper rows with consolidated type/content ===

update t_current keeper
set (type, content) = (
    with scoped_current as (
        select
            c.id,
            coalesce(u.username, c.username) as username,
            c.type as legacy_type,
            c.week,
            c.day,
            c.learn_level,
            c.content
        from t_current c
        left join tk_users u
            on u.user_id = c.user_id
        where lower(coalesce(u.username, c.username)) = lower('&target_username')
    ),
    mapped_current as (
        select
            id,
            username,
            legacy_type,
            week,
            day,
            learn_level,
            content,
            case
                when legacy_type in ('Work', 'Meeting', 'APEX') then 'Work'
                when legacy_type in ('Chinese', 'English', 'Mindset', 'Prompt', 'AI', 'ToDoList') then 'Study'
                when legacy_type in ('Exercise', 'Amusement') then 'Life'
                when legacy_type in ('Info', 'Email') then 'Info'
                else null
            end as target_type,
            to_number(substr(week, 2)) as week_num,
            to_number(substr(day, 2)) as day_num
        from scoped_current
    ),
    ranked_current as (
        select
            mapped_current.*,
            row_number() over (
                partition by target_type
                order by week_num desc, day_num desc, id desc
            ) as keeper_rank
        from mapped_current
        where target_type is not null
    ),
    merge_segments as (
        select
            id as source_id,
            target_type,
            keeper_rank,
            week_num,
            day_num,
            case
                when keeper_rank = 1 then
                    coalesce(content, '')
                else
                    chr(10) || chr(10) ||
                    '[原类型: ' || legacy_type || ' | 原进度: ' || week || '/' || day || ']' ||
                    chr(10) ||
                    coalesce(content, '')
            end as content_segment
        from ranked_current
    ),
    merged_targets as (
        select
            keeper.id as keeper_id,
            keeper.target_type,
            xmlcast(
                xmlagg(
                    xmlelement(e, segment.content_segment)
                    order by segment.keeper_rank, segment.week_num desc, segment.day_num desc, segment.source_id desc
                ) as clob
            ) as merged_content
        from ranked_current keeper
        join merge_segments segment
            on segment.target_type = keeper.target_type
        where keeper.keeper_rank = 1
        group by keeper.id, keeper.target_type
    )
    select
        merged_targets.target_type,
        merged_targets.merged_content
    from merged_targets
    where merged_targets.keeper_id = keeper.id
)
where keeper.id in (
    with scoped_current as (
        select
            c.id,
            coalesce(u.username, c.username) as username,
            c.type as legacy_type,
            c.week,
            c.day
        from t_current c
        left join tk_users u
            on u.user_id = c.user_id
        where lower(coalesce(u.username, c.username)) = lower('&target_username')
    ),
    mapped_current as (
        select
            id,
            case
                when legacy_type in ('Work', 'Meeting', 'APEX') then 'Work'
                when legacy_type in ('Chinese', 'English', 'Mindset', 'Prompt', 'AI', 'ToDoList') then 'Study'
                when legacy_type in ('Exercise', 'Amusement') then 'Life'
                when legacy_type in ('Info', 'Email') then 'Info'
                else null
            end as target_type,
            to_number(substr(week, 2)) as week_num,
            to_number(substr(day, 2)) as day_num
        from scoped_current
    ),
    ranked_current as (
        select
            mapped_current.*,
            row_number() over (
                partition by target_type
                order by week_num desc, day_num desc, id desc
            ) as keeper_rank
        from mapped_current
        where target_type is not null
    )
    select id
    from ranked_current
    where keeper_rank = 1
);

prompt === 3) Remove existing T_HISTORY counterparts for Alfred contributor rows ===

delete from t_history history_row
where exists (
    with scoped_current as (
        select
            c.id,
            c.username as username,
            c.type as legacy_type,
            c.week,
            c.day,
            c.learn_level
        from &&backup_table c
    ),
    mapped_current as (
        select
            id,
            username,
            legacy_type,
            week,
            day,
            learn_level,
            case
                when legacy_type in ('Work', 'Meeting', 'APEX') then 'Work'
                when legacy_type in ('Chinese', 'English', 'Mindset', 'Prompt', 'AI', 'ToDoList') then 'Study'
                when legacy_type in ('Exercise', 'Amusement') then 'Life'
                when legacy_type in ('Info', 'Email') then 'Info'
                else null
            end as target_type,
            to_number(substr(week, 2)) as week_num,
            to_number(substr(day, 2)) as day_num
        from scoped_current
    ),
    ranked_current as (
        select
            mapped_current.*,
            row_number() over (
                partition by target_type
                order by week_num desc, day_num desc, id desc
            ) as keeper_rank
        from mapped_current
        where target_type is not null
    )
    select 1
    from ranked_current contributor
    where contributor.keeper_rank > 1
      and history_row.type = contributor.legacy_type
      and history_row.week = contributor.week
      and history_row.day = contributor.day
      and history_row.learn_level = contributor.learn_level
      and lower(history_row.username) = lower(contributor.username)
);

prompt === 4) Delete Alfred contributor rows after keeper update ===

delete from t_current victim
where victim.id in (
    with scoped_current as (
        select
            c.id,
            c.username as username,
            c.type as legacy_type,
            c.week,
            c.day
        from &&backup_table c
    ),
    mapped_current as (
        select
            id,
            case
                when legacy_type in ('Work', 'Meeting', 'APEX') then 'Work'
                when legacy_type in ('Chinese', 'English', 'Mindset', 'Prompt', 'AI', 'ToDoList') then 'Study'
                when legacy_type in ('Exercise', 'Amusement') then 'Life'
                when legacy_type in ('Info', 'Email') then 'Info'
                else null
            end as target_type,
            to_number(substr(week, 2)) as week_num,
            to_number(substr(day, 2)) as day_num
        from scoped_current
    ),
    ranked_current as (
        select
            mapped_current.*,
            row_number() over (
                partition by target_type
                order by week_num desc, day_num desc, id desc
            ) as keeper_rank
        from mapped_current
        where target_type is not null
    )
    select id
    from ranked_current
    where keeper_rank > 1
);

prompt === 5) Post-migration final rows for Alfred ===

select
    c.id,
    coalesce(u.username, c.username) as username,
    c.type,
    c.week,
    c.day,
    c.learn_level,
    case
        when c.content is null then 0
        else length(c.content)
    end as content_length
from t_current c
left join tk_users u
    on u.user_id = c.user_id
where lower(coalesce(u.username, c.username)) = lower('&target_username')
order by
    case c.type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end,
    c.id;

prompt === 6) Post-migration row count by type ===

select
    c.type,
    count(*) as row_count
from t_current c
left join tk_users u
    on u.user_id = c.user_id
where lower(coalesce(u.username, c.username)) = lower('&target_username')
group by c.type
order by
    case c.type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end;

prompt === 7) Sanity check: Alfred rows still using legacy types ===

select
    c.id,
    coalesce(u.username, c.username) as username,
    c.type,
    c.week,
    c.day
from t_current c
left join tk_users u
    on u.user_id = c.user_id
where lower(coalesce(u.username, c.username)) = lower('&target_username')
  and c.type not in ('Work', 'Study', 'Life', 'Info')
order by c.type, c.id;

prompt === 8) Review the output above, then choose COMMIT or ROLLBACK manually ===
prompt Example:
prompt   COMMIT;
prompt or
prompt   ROLLBACK;

-- COMMIT;
