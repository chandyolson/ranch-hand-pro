# HerdWork AI Build Session Log — March 28-31, 2026

## Edge Functions (9): ai-report v14, ai-action v3, ai-health-report v2, scheduled-report v2, photo-extract v2, cow-cleaner-analyze v15, accept-invitation v4, send-invitation v4, import-customers v2
## Tables (5): ai_interaction_logs, ai_health_snapshots, ai_improvement_actions, pending_ai_actions, scheduled_reports
## DB Functions (7): ai_mark_animals_status, ai_create_flags, ai_resolve_flags, ai_create_calving_record, ai_create_treatment, ai_create_group, ai_add_animals_to_group
## Cron (2): weekly-ai-health-report (Mon 6am CT), check-scheduled-reports (hourly)
## Frontend (23 components): Full AI agent chat with read/write/file/photo capabilities
## Decisions: AI=agent not screen, default current year, 3-tier write safety, automated training loop, reports P0, nav grouped under AI Tools, files through chat
## Risk: Lovable overwrites ai-report Edge Function on deploy
## Next: Paste file upload prompt, set up Resend for herdwork.ai, test everything, rotate GitHub token
