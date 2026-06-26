# SQL Helpers

- [alfred_t_current_type_consolidation_dry_run.sql](/home/alfred/projects/trustedKnowledge/scripts/sql/alfred_t_current_type_consolidation_dry_run.sql): Alfred-only dry run for consolidating `T_CURRENT` legacy types into `Work / Study / Life / Info` without changing data.
- [alfred_t_current_type_consolidation_apply.sql](/home/alfred/projects/trustedKnowledge/scripts/sql/alfred_t_current_type_consolidation_apply.sql): Alfred-only formal migration SQL for backing up and consolidating `T_CURRENT` into `Work / Study / Life / Info`, with timestamped backup-table creation, post-run verification, and manual final `COMMIT` / `ROLLBACK`.
