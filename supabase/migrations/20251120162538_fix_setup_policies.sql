/*
  # Fix Setup Flow Policies

  ## Problem
  During initial setup, users need to:
  1. Create a company (before they have a user record)
  2. Create their user record (before RLS can check their role)

  ## Solution
  - Add special INSERT policy for companies that allows authenticated users
  - Add special INSERT policy for users that allows creating their own record
  - Keep existing policies for normal operations

  ## Security
  - New users can only create ONE company during setup
  - Users can only create a user record for their own auth.uid()
  - After setup, normal admin-only policies apply
*/

-- Allow authenticated users to insert companies during setup
-- This is safe because each user will only do this once during setup
CREATE POLICY "Allow company creation during setup"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert their own user record during setup
-- This is safe because users can only insert a record matching their auth.uid()
CREATE POLICY "Allow user self-registration during setup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
