-- PKG_AI_ASSISTANT deployment script for DEV_ALFRED.
-- Replaces the current package spec/body while preserving insert_ai_content
-- and adding the T_HISTORY vector refresh entry point.

CREATE OR REPLACE PACKAGE pkg_ai_assistant AS

  -- 保存 AI 分析结果；已存在同一业务键时更新评分和备注。
  PROCEDURE insert_ai_content (
    p_user_id     IN t_ai_content.user_id%TYPE,
    p_type        IN t_ai_content.type%TYPE,
    p_week        IN t_ai_content.week%TYPE,
    p_day         IN t_ai_content.day%TYPE,
    p_learn_level IN t_ai_content.learn_level%TYPE,
    p_ai_score    IN t_ai_content.ai_score%TYPE,
    p_ai_remark   IN t_ai_content.ai_remark%TYPE
  );

  -- ================================================================
  -- 为尚未生成向量，或内容变更后标记为待刷新的历史记录生成向量。
  -- 过程结束时提交本次向量更新。
  -- ================================================================
  PROCEDURE refresh_history_vectors;

  -- 为英语素材 FULL_SCRIPT 刷新向量。
  PROCEDURE refresh_english_vectors;

  -- 为博客工厂 TASK_CONTENT 刷新向量。
  PROCEDURE refresh_blog_factory_vectors;

END pkg_ai_assistant;
/

CREATE OR REPLACE PACKAGE BODY pkg_ai_assistant AS

  -- ================================================================
  -- AI 内容评分写入
  -- 相同的用户、类型、周期和学习等级存在时，改为更新评分和备注。
  -- ================================================================
  PROCEDURE insert_ai_content (
    p_user_id     IN t_ai_content.user_id%TYPE,
    p_type        IN t_ai_content.type%TYPE,
    p_week        IN t_ai_content.week%TYPE,
    p_day         IN t_ai_content.day%TYPE,
    p_learn_level IN t_ai_content.learn_level%TYPE,
    p_ai_score    IN t_ai_content.ai_score%TYPE,
    p_ai_remark   IN t_ai_content.ai_remark%TYPE
  ) IS
  BEGIN
    IF p_user_id IS NULL
       OR TRIM(p_type) IS NULL
       OR TRIM(p_week) IS NULL
       OR TRIM(p_day) IS NULL
       OR p_learn_level IS NULL THEN
      RAISE_APPLICATION_ERROR(
        -20001,
        'USER_ID, TYPE, WEEK, DAY and LEARN_LEVEL are required.'
      );
    END IF;

    BEGIN
      INSERT INTO t_ai_content (
        user_id,
        type,
        week,
        day,
        learn_level,
        ai_score,
        ai_remark
      ) VALUES (
        p_user_id,
        TRIM(p_type),
        TRIM(p_week),
        TRIM(p_day),
        p_learn_level,
        p_ai_score,
        p_ai_remark
      );
    EXCEPTION
      WHEN DUP_VAL_ON_INDEX THEN
        UPDATE t_ai_content
        SET    ai_score = p_ai_score,
               ai_remark = p_ai_remark,
               update_time = SYSDATE
        WHERE  user_id = p_user_id
        AND    type = TRIM(p_type)
        AND    week = TRIM(p_week)
        AND    day = TRIM(p_day)
        AND    learn_level = p_learn_level;
    END;
  END insert_ai_content;

  -- ================================================================
  -- T_HISTORY 向量刷新
  -- 仅处理已有内容且尚未向量化，或被标记为 v_needs_update = 1 的记录。
  -- 每一行使用 BGE_BASE 由 CONTENT 生成向量；完成后统一提交。
  -- ================================================================
  PROCEDURE refresh_history_vectors IS
  BEGIN
    -- 固定待处理记录，避免更新后的记录在本次游标中被重复处理。
    FOR r IN (
      SELECT rowid AS rid,
             content
      FROM   t_history
      WHERE  content IS NOT NULL
      AND    (v IS NULL OR v_needs_update = 1)
    ) LOOP
      -- 同步写入新向量，并清除“待更新”标记。
      UPDATE t_history
      SET    v = vector_embedding(BGE_BASE USING r.content AS DATA),
             v_needs_update = 0
      WHERE  rowid = r.rid;
    END LOOP;

    COMMIT;
  END refresh_history_vectors;

  -- ================================================================
  -- T_ENGLISH 向量刷新（FULL_SCRIPT）
  -- ================================================================
  PROCEDURE refresh_english_vectors IS
  BEGIN
    FOR r IN (
      SELECT rowid AS rid, full_script
      FROM   t_english
      WHERE  full_script IS NOT NULL
      AND    (v IS NULL OR v_needs_update = 1)
    ) LOOP
      UPDATE t_english
      SET    v = vector_embedding(BGE_BASE USING r.full_script AS DATA),
             v_needs_update = 0
      WHERE  rowid = r.rid;
    END LOOP;
    COMMIT;
  END refresh_english_vectors;

  -- ================================================================
  -- AI_BLOG_FACTORY 向量刷新（TASK_CONTENT）
  -- ================================================================
  PROCEDURE refresh_blog_factory_vectors IS
  BEGIN
    FOR r IN (
      SELECT rowid AS rid, task_content
      FROM   ai_blog_factory
      WHERE  task_content IS NOT NULL
      AND    (v IS NULL OR v_needs_update = 1)
    ) LOOP
      UPDATE ai_blog_factory
      SET    v = vector_embedding(BGE_BASE USING r.task_content AS DATA),
             v_needs_update = 0
      WHERE  rowid = r.rid;
    END LOOP;
    COMMIT;
  END refresh_blog_factory_vectors;

END pkg_ai_assistant;
/

-- Invoke the refresh when required:
--
-- BEGIN
--   pkg_ai_assistant.refresh_history_vectors;
--   pkg_ai_assistant.refresh_english_vectors;
--   pkg_ai_assistant.refresh_blog_factory_vectors;
-- END;
-- /
