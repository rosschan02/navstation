-- Migration: Relax phonebook_entries constraints
-- Version: 007
-- Description: Allow short_code to be 3-4 digits or empty, allow duplicates for both short_code and long_code

-- Remove UNIQUE constraints
ALTER TABLE phonebook_entries DROP CONSTRAINT IF EXISTS phonebook_entries_short_code_key;
ALTER TABLE phonebook_entries DROP CONSTRAINT IF EXISTS phonebook_entries_long_code_key;

-- Remove old CHECK constraints
ALTER TABLE phonebook_entries DROP CONSTRAINT IF EXISTS phonebook_entries_short_code_check;
ALTER TABLE phonebook_entries DROP CONSTRAINT IF EXISTS phonebook_entries_long_code_check;

-- Change short_code: CHAR(4) NOT NULL -> VARCHAR(4), nullable, allow 3-4 digits or empty
ALTER TABLE phonebook_entries ALTER COLUMN short_code TYPE VARCHAR(4);
ALTER TABLE phonebook_entries ALTER COLUMN short_code DROP NOT NULL;
ALTER TABLE phonebook_entries ALTER COLUMN short_code SET DEFAULT '';
ALTER TABLE phonebook_entries ADD CONSTRAINT phonebook_entries_short_code_check
  CHECK (short_code IS NULL OR short_code = '' OR short_code ~ '^[0-9]{3,4}$');

-- Change long_code: drop NOT NULL and UNIQUE, keep VARCHAR(13)
ALTER TABLE phonebook_entries ALTER COLUMN long_code DROP NOT NULL;
ALTER TABLE phonebook_entries ALTER COLUMN long_code SET DEFAULT '';
ALTER TABLE phonebook_entries ADD CONSTRAINT phonebook_entries_long_code_check
  CHECK (long_code IS NULL OR long_code = '' OR long_code ~ '^[0-9]{1,13}$');
