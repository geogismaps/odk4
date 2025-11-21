/*
  # Fix Users RLS Policies - Remove Infinite Recursion

  ## Problem
  The current policies query the users table from within users table policies,
  causing infinite recursion.

  ## Solution
  - Drop existing recursive policies
  - Create helper functions in public schema
  - Create new simplified policies using these functions

  ## Security
  - Maintains same security: users can only access their company's data
  - Admins can manage users in their company
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their company" ON users;
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their company" ON users;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = user_id LIMIT 1
$$;

-- New simplified policies that avoid recursion
CREATE POLICY "Users can view own record directly"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view same company users"
  ON users FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can insert users in company"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can update users in company"
  ON users FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid())
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can delete users in company"
  ON users FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid()) AND
    id != auth.uid()
  );
