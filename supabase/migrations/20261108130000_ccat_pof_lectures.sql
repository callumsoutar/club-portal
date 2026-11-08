-- Replace the POF placeholder with the principles-of-flight lecture list.
-- Duplicate titles from the source notes are kept once, in teaching order.

delete from public.ccat_items as item
using public.ccat_categories as category
where item.category_id = category.id
  and category.key = 'pof'
  and item.name = 'POF lecture (placeholder)'
  and not exists (
    select 1 from public.ccat_events as event where event.item_id = item.id
  )
  and not exists (
    select 1 from public.ccat_plan_items as plan_item where plan_item.item_id = item.id
  );

insert into public.ccat_items (category_id, name, sort_order)
select category.id, lecture.name, lecture.sort_order
from public.ccat_categories as category
join (
  values
    ('Formulae of Mechanics', 1),
    ('Newton''s Laws of Motion', 2),
    ('Production of Lift', 3),
    ('Lift Formula', 4),
    ('Lift Curve', 5),
    ('Lift and the Aerofoil', 6),
    ('Pressure Patterns', 7),
    ('Factors of Lift', 8),
    ('Stalling', 9),
    ('Factors of Stall', 10),
    ('The Drag Tree', 11),
    ('Induced Drag (ID)', 12),
    ('Factors Affecting ID', 13),
    ('ID Coefficient', 14),
    ('Boundary Layer', 15),
    ('Laminar Aerofoil', 16),
    ('Parasite Drag', 17),
    ('Drag Formulae', 18),
    ('Total Drag Curve', 19),
    ('Total Resultant', 20),
    ('Lift Drag Ratio', 21),
    ('L:D Curves', 22),
    ('Ideal Aerofoil', 23),
    ('Excess power vs excess thrust', 24),
    ('Max Rate Turn', 25),
    ('Stability', 26),
    ('Thrust', 27),
    ('Wind-milling Prop', 28),
    ('Power on Brake', 29),
    ('Prop Twist', 30),
    ('Variable Pitch Prop', 31),
    ('CTM / ATM', 32),
    ('Power Absorption', 33),
    ('Thrust Along Blade', 34),
    ('Swing on Takeoff', 35),
    ('Range of Speeds', 36),
    ('Flying for Range', 37),
    ('Flying for Endurance', 38),
    ('Forces in S&L', 39),
    ('The Ideal Arrangement', 40),
    ('Performance, Stability & Control', 41),
    ('Permanent Download', 42),
    ('Forces & Factors in a Climb', 43),
    ('Forces & Factors in a Glide', 44),
    ('Forces in a Turn', 45),
    ('Angle of Bank', 46),
    ('Load Factor', 47),
    ('Rate One Turn', 48),
    ('Stall Speed in Turn', 49),
    ('Stability: Static & Dynamic', 50),
    ('Longitudinal Stability', 51),
    ('Lateral Stability', 52),
    ('Directional Stability', 53),
    ('Spiral Instability & Dutch Roll', 54),
    ('Flight Controls', 55),
    ('Mass Balancing', 56),
    ('Aerodynamic Balance', 57),
    ('Horn Balance / Inset Hinge', 58),
    ('Adverse Yaw', 59),
    ('Adverse Yaw Remedies', 60),
    ('Trim Tab', 61),
    ('Balance & Servo Tabs', 62),
    ('Anti-Balance Tab', 63),
    ('Flaps / Slots / Slats', 64)
) as lecture(name, sort_order) on true
where category.key = 'pof'
  and not exists (
    select 1
    from public.ccat_items as existing
    where existing.category_id = category.id
      and existing.name = lecture.name
  );
