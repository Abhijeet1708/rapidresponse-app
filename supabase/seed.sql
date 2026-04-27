-- Seed Data for RapidResponse
-- Organizations
INSERT INTO organizations (id, name, subscription_status) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Acme Hospitality Group', 'active');

-- Properties
INSERT INTO properties (id, organization_id, name, address, escalation_threshold_seconds, emergency_phone_number, on_call_manager_phone_number, subscription_active)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'The Grand Hotel', '123 Main St', 90, '911', '+15551234567', true);

-- Floors
INSERT INTO floors (id, property_id, floor_number, floor_label)
VALUES 
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 1, 'Lobby'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 2, 'Floor 2'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 3, 'Floor 3');

-- For users we cannot easily seed them with passwords since we are using Supabase Auth magic links.
-- We will create dummy users directly in auth.users and public.users if possible, or just leave it for application logic.
