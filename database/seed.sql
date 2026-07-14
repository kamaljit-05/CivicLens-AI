-- Seed data: predefined issue categories mapped to municipal departments
INSERT INTO categories (slug, label, parent_department) VALUES
  ('pothole',      'Pothole',            'Roads'),
  ('streetlight',  'Streetlight Outage', 'Electrical'),
  ('garbage',      'Garbage / Litter',   'Sanitation'),
  ('water_leak',   'Water Leak',         'Water Supply'),
  ('drainage',     'Blocked Drainage',   'Sanitation'),
  ('sidewalk',     'Damaged Sidewalk',   'Roads'),
  ('graffiti',     'Graffiti / Vandalism','Parks & Public Property'),
  ('traffic_signal','Traffic Signal Fault','Traffic'),
  ('tree',         'Fallen / Hazard Tree','Parks & Public Property'),
  ('stray_animal', 'Stray Animal Concern','Public Health'),
  ('other',        'Other',              'General')
ON CONFLICT DO NOTHING;
