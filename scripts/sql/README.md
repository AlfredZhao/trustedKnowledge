# SQL Helpers

- [refresh_vectors_every_8_hours_apply.sql](/home/alfred/projects/trustedKnowledge/scripts/sql/refresh_vectors_every_8_hours_apply.sql): Repeatable Oracle `DBMS_SCHEDULER` deployment for refreshing pending History, English Materials, and Blog Factory vectors every eight hours. Includes scheduler-state and recent-run diagnostics; requires the three `PKG_AI_ASSISTANT` refresh procedures and `CREATE JOB` privilege.

- [alfred_t_current_type_consolidation_dry_run.sql](/home/alfred/projects/trustedKnowledge/scripts/sql/alfred_t_current_type_consolidation_dry_run.sql): Alfred-only dry run for consolidating `T_CURRENT` legacy types into `Work / Study / Life / Info` without changing data.
- [alfred_t_current_type_consolidation_apply.sql](/home/alfred/projects/trustedKnowledge/scripts/sql/alfred_t_current_type_consolidation_apply.sql): Alfred-only formal migration SQL for backing up and consolidating `T_CURRENT` into `Work / Study / Life / Info`, with timestamped backup-table creation, post-run verification, and manual final `COMMIT` / `ROLLBACK`.
