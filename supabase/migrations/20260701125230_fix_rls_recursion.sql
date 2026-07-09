/*
# Fix infinite recursion in user_profiles RLS policies

1. Problem
- The admin_select_all_profiles and admin_update_all_profiles policies query user_profiles within their own RLS check, causing infinite recursion.
- When any query hits user_profiles, the policy evaluates a subquery on user_profiles, which triggers the same policy again.

2. Fix
- Drop the recursive admin policies.
- Replace with a security definer function that checks the user's role without triggering RLS recursion.
- The function runs as the owner (bypassing RLS) to look up the caller's role, then the policy uses that function result.

3. Security
- The function is SECURITY DEFINER and only reads the role column — no data exposure.
- RLS remains enabled; policies still enforce ownership and admin checks.
*/

-- Drop the recursive policies
DROP POLICY IF EXISTS "admin_select_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON user_profiles;

-- Create a security definer function to check if the current user is an admin
-- This avoids RLS recursion by running with elevated privileges
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'administrator' AND active = true
  );
$$;

-- Re-create admin policies using the function (no recursion)
CREATE POLICY "admin_select_all_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (is_current_user_admin());

CREATE POLICY "admin_update_all_profiles" ON user_profiles FOR UPDATE
  TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- Also fix the system_settings admin policy to use the function
DROP POLICY IF EXISTS "admin_update_settings" ON system_settings;
CREATE POLICY "admin_update_settings" ON system_settings FOR UPDATE
  TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
