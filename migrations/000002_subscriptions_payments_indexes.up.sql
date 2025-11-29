-- Subscriptions improvements (если таблица уже есть, этот файл добавляет индексы и constraints)
-- Если subscriptions уже существует из первой миграции, пропустить CREATE TABLE

-- Add index for finding active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_group_status 
ON subscriptions(student_id, group_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at 
ON subscriptions(expires_at) WHERE expires_at IS NOT NULL;

-- Payments improvements
CREATE INDEX IF NOT EXISTS idx_payments_subscription 
ON payments(subscription_id);

-- Attendances - add unique constraint to prevent double marking
ALTER TABLE attendances 
ADD CONSTRAINT unique_session_student UNIQUE (session_id, student_id);

-- Add subscription_id to attendances if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE attendances ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendances_subscription 
ON attendances(subscription_id) WHERE subscription_id IS NOT NULL;
