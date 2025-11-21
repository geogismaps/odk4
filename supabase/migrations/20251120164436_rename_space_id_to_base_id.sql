/*
  # Rename teable_space_id to teable_base_id

  ## Problem
  The projects table currently uses `teable_space_id` but Teable API expects `baseId` not `spaceId`.
  The API endpoint is `/api/base/{baseId}/table` not `/api/base/{spaceId}/table`.

  ## Changes
  1. Rename column from `teable_space_id` to `teable_base_id` in projects table
  
  ## Notes
  - This is a simple column rename to match Teable API expectations
  - All existing data will be preserved
*/

-- Rename the column
ALTER TABLE projects 
RENAME COLUMN teable_space_id TO teable_base_id;
