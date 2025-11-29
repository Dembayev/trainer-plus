-- Rollback indexes and constraints
DROP INDEX IF EXISTS idx_subscriptions_student_group_status;
DROP INDEX IF EXISTS idx_subscriptions_expires_at;
DROP INDEX IF EXISTS idx_payments_subscription;
DROP INDEX IF EXISTS idx_attendances_subscription;

ALTER TABLE attendances DROP CONSTRAINT IF EXISTS unique_session_student;
ALTER TABLE attendances DROP COLUMN IF EXISTS subscription_id;
