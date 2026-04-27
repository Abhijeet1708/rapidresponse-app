-- ENUMs
CREATE TYPE user_role AS ENUM ('Responder', 'Manager', 'Admin', 'Superadmin');
CREATE TYPE incident_category AS ENUM (
  'Medical Emergency', 'Fire', 'Smoke or Gas Leak', 'Security Threat', 
  'Assault or Harassment', 'Flood or Water Damage', 'Power Failure', 
  'Elevator Entrapment', 'Suspicious Person', 'Child Safety', 'Theft', 'Other'
);
CREATE TYPE incident_status AS ENUM ('Reported', 'Acknowledged', 'Responding', 'Escalated', 'Resolved');

-- 1. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Properties
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    logo_url TEXT,
    escalation_threshold_seconds INTEGER DEFAULT 90,
    emergency_phone_number TEXT,
    on_call_manager_phone_number TEXT,
    subscription_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Floors
CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    floor_label TEXT NOT NULL,
    floor_map_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Users (Profiles linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'Responder',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_on_duty BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Incidents
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category incident_category NOT NULL,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    location_description TEXT,
    pin_coordinates JSONB,
    guest_description TEXT,
    voice_note_url TEXT,
    photo_url TEXT,
    status incident_status NOT NULL DEFAULT 'Reported',
    claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    status_audit_log JSONB DEFAULT '[]'::jsonb
);

-- 6. Incident Assignments
CREATE TABLE incident_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(incident_id, user_id)
);

-- 7. Incident Messages
CREATE TABLE incident_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Push Subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get User's Property ID
CREATE OR REPLACE FUNCTION get_user_property_id() RETURNS UUID AS $$
  SELECT property_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Get User's Organization ID
CREATE OR REPLACE FUNCTION get_user_org_id() RETURNS UUID AS $$
  SELECT p.organization_id 
  FROM users u
  JOIN properties p ON p.id = u.property_id
  WHERE u.id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Is User Superadmin
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$
  SELECT role = 'Superadmin' FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Is User Admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT role IN ('Admin', 'Superadmin') FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- RLS Policies

-- 1. Organizations
-- Superadmins can view and update their own organization.
CREATE POLICY "Superadmins can view their organization" ON organizations
  FOR SELECT USING (id = get_user_org_id() AND is_superadmin());

CREATE POLICY "Superadmins can update their organization" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND is_superadmin());

-- 2. Properties
-- All staff can view their own property. Superadmins can view all properties in their org.
CREATE POLICY "Staff can view their own property" ON properties
  FOR SELECT USING (id = get_user_property_id() OR (organization_id = get_user_org_id() AND is_superadmin()));

CREATE POLICY "Admins can update their property" ON properties
  FOR UPDATE USING ((id = get_user_property_id() AND is_admin()) OR (organization_id = get_user_org_id() AND is_superadmin()));

-- 3. Floors
-- Public can read floors (needed for guest incident reporting). Staff can read. Admins can manage.
CREATE POLICY "Anyone can view floors" ON floors
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert floors" ON floors
  FOR INSERT WITH CHECK ((property_id = get_user_property_id() AND is_admin()) OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

CREATE POLICY "Admins can update floors" ON floors
  FOR UPDATE USING ((property_id = get_user_property_id() AND is_admin()) OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

CREATE POLICY "Admins can delete floors" ON floors
  FOR DELETE USING ((property_id = get_user_property_id() AND is_admin()) OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

-- 4. Users
-- Staff can view other staff in their property.
CREATE POLICY "Staff can view users in same property" ON users
  FOR SELECT USING (property_id = get_user_property_id() OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK ((property_id = get_user_property_id() AND is_admin()) OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING ((property_id = get_user_property_id() AND is_admin()) OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

CREATE POLICY "Users can update their own status" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING ((property_id = get_user_property_id() AND is_admin()) OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

-- 5. Incidents
-- Public can insert incidents (guest reporting). Staff can read/update their property's incidents.
CREATE POLICY "Public can insert incidents" ON incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view property incidents" ON incidents
  FOR SELECT USING (property_id = get_user_property_id() OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

CREATE POLICY "Staff can update property incidents" ON incidents
  FOR UPDATE USING (property_id = get_user_property_id() OR (property_id IN (SELECT id FROM properties WHERE organization_id = get_user_org_id()) AND is_superadmin()));

-- 6. Incident Assignments
CREATE POLICY "Staff can view assignments in their property" ON incident_assignments
  FOR SELECT USING (incident_id IN (SELECT id FROM incidents WHERE property_id = get_user_property_id()));

CREATE POLICY "Staff can insert assignments for their property" ON incident_assignments
  FOR INSERT WITH CHECK (incident_id IN (SELECT id FROM incidents WHERE property_id = get_user_property_id()));

CREATE POLICY "Staff can delete assignments for their property" ON incident_assignments
  FOR DELETE USING (incident_id IN (SELECT id FROM incidents WHERE property_id = get_user_property_id()));

-- 7. Incident Messages
CREATE POLICY "Staff can view messages for property incidents" ON incident_messages
  FOR SELECT USING (incident_id IN (SELECT id FROM incidents WHERE property_id = get_user_property_id()));

CREATE POLICY "Staff can insert messages for property incidents" ON incident_messages
  FOR INSERT WITH CHECK (incident_id IN (SELECT id FROM incidents WHERE property_id = get_user_property_id()));

-- 8. Push Subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());
