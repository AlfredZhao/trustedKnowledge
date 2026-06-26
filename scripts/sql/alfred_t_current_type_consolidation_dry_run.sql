-- Alfred-only dry run for T_CURRENT type consolidation.
-- Purpose:
-- 1. Preview Alfred's current rows in scope.
-- 2. Map legacy types into Work / Study / Life / Info.
-- 3. Pick one keeper row per target type by furthest week/day progress.
-- 4. Preview which rows would be merged and which rows would be removed.
-- 5. Preview merged content text without changing data.
--
-- Notes:
-- - This script is SELECT-only. It does not update, delete, or commit anything.
-- - It scopes strictly to Alfred via USER_ID when available, with USERNAME fallback.
-- - Week/day ordering is numeric: higher Wxx first, then higher Dxx.
--
-- Suggested execution:
--   sql /nolog
--   connect <user>/<password>@<dsn>
--   @scripts/sql/alfred_t_current_type_consolidation_dry_run.sql

define target_username = 'Alfred'

prompt === 1) Scope check: Alfred rows currently in T_CURRENT ===

with scoped_current as (
    select
        c.id,
        c.user_id,
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
)
select
    id,
    username,
    legacy_type,
    week,
    day,
    learn_level,
    case
        when content is null then 0
        else length(content)
    end as content_length
from scoped_current
order by legacy_type, id;

prompt === 2) Mapping preview: legacy type -> target type ===

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
        end as target_type
    from scoped_current
)
select
    id,
    username,
    legacy_type,
    target_type,
    week,
    day
from mapped_current
order by
    case target_type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end,
    legacy_type,
    id;

prompt === 3) Safety check: any Alfred rows left unmapped? ===

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
        username,
        legacy_type,
        week,
        day,
        case
            when legacy_type in ('Work', 'Meeting', 'APEX') then 'Work'
            when legacy_type in ('Chinese', 'English', 'Mindset', 'Prompt', 'AI', 'ToDoList') then 'Study'
            when legacy_type in ('Exercise', 'Amusement') then 'Life'
            when legacy_type in ('Info', 'Email') then 'Info'
            else null
        end as target_type
    from scoped_current
)
select
    id,
    username,
    legacy_type,
    week,
    day
from mapped_current
where target_type is null
order by legacy_type, id;

prompt === 4) Keeper selection: one row per target type by furthest progress ===

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
)
select
    target_type,
    id as keeper_id,
    legacy_type as keeper_legacy_type,
    week,
    day,
    learn_level,
    case
        when content is null then 0
        else length(content)
    end as content_length
from ranked_current
where keeper_rank = 1
order by
    case target_type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end;

prompt === 5) Merge plan: keeper row + contributor rows ===

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
)
select
    target_type,
    case when keeper_rank = 1 then 'KEEP' else 'MERGE_INTO_KEEPER' end as action_flag,
    id,
    legacy_type,
    week,
    day,
    learn_level,
    case
        when content is null then 0
        else length(content)
    end as content_length
from ranked_current
order by
    case target_type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end,
    keeper_rank,
    week_num desc,
    day_num desc,
    id desc;

prompt === 6) Delete candidate preview: rows that would disappear from T_CURRENT ===

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
)
select
    target_type,
    id,
    legacy_type,
    week,
    day,
    learn_level
from ranked_current
where keeper_rank > 1
order by
    case target_type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end,
    week_num desc,
    day_num desc,
    id desc;

prompt === 7) Merged content preview per target type (text may be long) ===

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
        target_type,
        keeper_rank,
        week_num,
        day_num,
        id,
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
)
select
    target_type,
    xmlcast(
        xmlagg(
            xmlelement(e, content_segment)
            order by keeper_rank, week_num desc, day_num desc, id desc
        ) as clob
    ) as merged_content_preview
from merge_segments
group by target_type
order by
    case target_type
        when 'Work' then 1
        when 'Study' then 2
        when 'Life' then 3
        when 'Info' then 4
        else 9
    end;

prompt === 8) Expected final shape after migration ===

select 'Work' as target_type, 1 as expected_rows from dual
union all
select 'Study' as target_type, 1 as expected_rows from dual
union all
select 'Life' as target_type, 1 as expected_rows from dual
union all
select 'Info' as target_type, 1 as expected_rows from dual;

-- Optional pre-migration backup example. Keep commented until you really run it.
-- create table t_current_bak_alfred_20260626 as
-- select c.*
-- from t_current c
-- left join tk_users u
--   on u.user_id = c.user_id
-- where lower(coalesce(u.username, c.username)) = lower('&target_username');
