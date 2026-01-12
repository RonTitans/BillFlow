-- Add billing period columns to file_uploads table
ALTER TABLE file_uploads 
ADD COLUMN IF NOT EXISTS billing_month INTEGER,
ADD COLUMN IF NOT EXISTS billing_year INTEGER,
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20);

-- Update existing records based on filename patterns
UPDATE file_uploads 
SET billing_month = 1, billing_year = 2025, billing_period = '2025-01'
WHERE original_filename LIKE '%1.25%' OR original_filename LIKE '%ינואר%' OR original_filename LIKE '%January%';

UPDATE file_uploads 
SET billing_month = 2, billing_year = 2025, billing_period = '2025-02'
WHERE original_filename LIKE '%2.25%' OR original_filename LIKE '%פברואר%' OR original_filename LIKE '%February%';

UPDATE file_uploads 
SET billing_month = 3, billing_year = 2025, billing_period = '2025-03'
WHERE original_filename LIKE '%3.25%' OR original_filename LIKE '%מרץ%' OR original_filename LIKE '%March%';

UPDATE file_uploads 
SET billing_month = 4, billing_year = 2025, billing_period = '2025-04'
WHERE original_filename LIKE '%4.25%' OR original_filename LIKE '%אפריל%' OR original_filename LIKE '%April%';

UPDATE file_uploads 
SET billing_month = 5, billing_year = 2025, billing_period = '2025-05'
WHERE original_filename LIKE '%5.25%' OR original_filename LIKE '%מאי%' OR original_filename LIKE '%May%';

-- For sample_test.csv, assume February 2025 based on the data
UPDATE file_uploads 
SET billing_month = 2, billing_year = 2025, billing_period = '2025-02'
WHERE original_filename = 'sample_test.csv';