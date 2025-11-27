-- Add unique constraint for CPF in profiles table
-- This ensures only one profile can have the same CPF

-- First, check if there are any duplicate CPFs and clean them up
-- Keep only the most recent profile for each CPF
WITH duplicates AS (
  SELECT cpf, MIN(created_at) as first_created
  FROM profiles
  WHERE cpf IS NOT NULL AND cpf != ''
  GROUP BY cpf
  HAVING COUNT(*) > 1
)
UPDATE profiles
SET cpf = NULL
WHERE cpf IN (SELECT cpf FROM duplicates)
  AND created_at > (SELECT first_created FROM duplicates WHERE duplicates.cpf = profiles.cpf);

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique 
ON profiles(cpf) 
WHERE cpf IS NOT NULL AND cpf != '';

-- Add comment to explain the constraint
COMMENT ON INDEX idx_profiles_cpf_unique IS 'Ensures each CPF can only be registered once in the system';
