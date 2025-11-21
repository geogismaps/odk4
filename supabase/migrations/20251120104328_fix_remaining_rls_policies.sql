/*
  # Fix Remaining RLS Policies

  ## Changes
  - Update policies for projects, forms, and submissions
  - Use helper functions instead of direct users table queries
*/

-- Fix companies policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can update their company" ON companies;

CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    id = public.get_user_company_id(auth.uid())
  );

-- Fix projects policies
DROP POLICY IF EXISTS "Users can view projects in their company" ON projects;
DROP POLICY IF EXISTS "Admins can insert projects in their company" ON projects;
DROP POLICY IF EXISTS "Admins can update projects in their company" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects in their company" ON projects;

CREATE POLICY "Users can view company projects"
  ON projects FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- Fix forms policies
DROP POLICY IF EXISTS "Users can view forms in their company projects" ON forms;
DROP POLICY IF EXISTS "Admins can manage forms" ON forms;

CREATE POLICY "Users can view company forms"
  ON forms FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can insert forms"
  ON forms FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin' AND
    project_id IN (
      SELECT id FROM projects 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can update forms"
  ON forms FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    project_id IN (
      SELECT id FROM projects 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can delete forms"
  ON forms FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    project_id IN (
      SELECT id FROM projects 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

-- Fix submissions policies
DROP POLICY IF EXISTS "Users can view submissions in their company" ON submissions;
DROP POLICY IF EXISTS "Users can insert submissions" ON submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON submissions;
DROP POLICY IF EXISTS "Admins can update all submissions in their company" ON submissions;
DROP POLICY IF EXISTS "Admins can delete submissions in their company" ON submissions;

CREATE POLICY "Users can view company submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    form_id IN (
      SELECT f.id FROM forms f
      JOIN projects p ON f.project_id = p.id
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can create submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    form_id IN (
      SELECT f.id FROM forms f
      JOIN projects p ON f.project_id = p.id
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update company submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    form_id IN (
      SELECT f.id FROM forms f
      JOIN projects p ON f.project_id = p.id
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can delete company submissions"
  ON submissions FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin' AND
    form_id IN (
      SELECT f.id FROM forms f
      JOIN projects p ON f.project_id = p.id
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    )
  );
