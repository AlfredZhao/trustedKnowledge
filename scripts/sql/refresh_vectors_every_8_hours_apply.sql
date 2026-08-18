-- Automatic vector refresh scheduler for DEV_ALFRED.
--
-- Prerequisites:
--   1. PKG_AI_ASSISTANT.refresh_history_vectors is deployed.
--   2. PKG_AI_ASSISTANT.refresh_english_vectors is deployed.
--   3. PKG_AI_ASSISTANT.refresh_blog_factory_vectors is deployed.
--   4. The executing schema has CREATE JOB and EXECUTE on DBMS_SCHEDULER.
--
-- Safe to run repeatedly. If the job already exists and is not running, this
-- script replaces it with the definition below. If it is running, Oracle stops
-- the deployment with an error instead of interrupting the active refresh.
--
-- The first scheduled run is eight hours after deployment. Later runs are every
-- eight hours relative to the job start time. DBMS_SCHEDULER prevents the same
-- job from overlapping with itself; each run is recorded in USER_SCHEDULER_JOB_RUN_DETAILS.

DECLARE
  v_job_exists PLS_INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO   v_job_exists
  FROM   user_scheduler_jobs
  WHERE  job_name = 'TK_REFRESH_VECTORS_8H';

  IF v_job_exists > 0 THEN
    DBMS_SCHEDULER.DROP_JOB(
      job_name => 'TK_REFRESH_VECTORS_8H',
      force    => FALSE
    );
  END IF;

  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'TK_REFRESH_VECTORS_8H',
    job_type        => 'PLSQL_BLOCK',
    job_action      => q'[
BEGIN
  pkg_ai_assistant.refresh_history_vectors;
  pkg_ai_assistant.refresh_english_vectors;
  pkg_ai_assistant.refresh_blog_factory_vectors;
END;
]',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=HOURLY;INTERVAL=8',
    enabled         => TRUE,
    auto_drop       => FALSE,
    comments        => 'Refreshes pending History, English Materials, and Blog Factory vectors every eight hours.'
  );

  DBMS_SCHEDULER.SET_ATTRIBUTE(
    name      => 'TK_REFRESH_VECTORS_8H',
    attribute => 'logging_level',
    value     => DBMS_SCHEDULER.LOGGING_FULL
  );
END;
/

-- Deployment verification
SELECT job_name,
       enabled,
       state,
       start_date,
       repeat_interval,
       next_run_date,
       comments
FROM   user_scheduler_jobs
WHERE  job_name = 'TK_REFRESH_VECTORS_8H';

-- Recent run history / failure diagnostics
SELECT log_date,
       status,
       run_duration,
       additional_info,
       errors
FROM   user_scheduler_job_run_details
WHERE  job_name = 'TK_REFRESH_VECTORS_8H'
ORDER  BY log_date DESC
FETCH FIRST 20 ROWS ONLY;

-- Optional smoke test: runs now without changing the next scheduled run time.
-- BEGIN
--   DBMS_SCHEDULER.RUN_JOB('TK_REFRESH_VECTORS_8H', use_current_session => TRUE);
-- END;
-- /
