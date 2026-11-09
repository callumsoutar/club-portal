-- Replace the detailed POF lecture list with the syllabus from the principles-of-flight table.
-- Sign-offs on titles that are not in this list are removed with those titles.

delete from public.ccat_plan_items as plan_item
using public.ccat_items as item
join public.ccat_categories as category on category.id = item.category_id
where plan_item.item_id = item.id
  and category.key = 'pof'
  and item.name not in (
    'Aeroscience',
    'The Atmosphere',
    'ISA',
    'Lift',
    'Drag',
    'Stability',
    'Manoeuvres',
    'Straight & Level',
    'Climbing & Descending turns',
    'Climbing',
    'Descending',
    'Stalling',
    'Wing Drops',
    'Lift:Drag Ratio',
    'Ideal Aerofoil',
    'Lift Augmentation',
    'Flight Controls & Balancing',
    'Tabs',
    'Max Rate Turns',
    'Aspect Ratio',
    'Angle of Climb',
    'Rate of Climb',
    'Range',
    'Endurance',
    'Propellers'
  );

delete from public.ccat_events as event
using public.ccat_items as item
join public.ccat_categories as category on category.id = item.category_id
where event.item_id = item.id
  and category.key = 'pof'
  and item.name not in (
    'Aeroscience',
    'The Atmosphere',
    'ISA',
    'Lift',
    'Drag',
    'Stability',
    'Manoeuvres',
    'Straight & Level',
    'Climbing & Descending turns',
    'Climbing',
    'Descending',
    'Stalling',
    'Wing Drops',
    'Lift:Drag Ratio',
    'Ideal Aerofoil',
    'Lift Augmentation',
    'Flight Controls & Balancing',
    'Tabs',
    'Max Rate Turns',
    'Aspect Ratio',
    'Angle of Climb',
    'Rate of Climb',
    'Range',
    'Endurance',
    'Propellers'
  );

delete from public.ccat_items as item
using public.ccat_categories as category
where item.category_id = category.id
  and category.key = 'pof'
  and item.name not in (
    'Aeroscience',
    'The Atmosphere',
    'ISA',
    'Lift',
    'Drag',
    'Stability',
    'Manoeuvres',
    'Straight & Level',
    'Climbing & Descending turns',
    'Climbing',
    'Descending',
    'Stalling',
    'Wing Drops',
    'Lift:Drag Ratio',
    'Ideal Aerofoil',
    'Lift Augmentation',
    'Flight Controls & Balancing',
    'Tabs',
    'Max Rate Turns',
    'Aspect Ratio',
    'Angle of Climb',
    'Rate of Climb',
    'Range',
    'Endurance',
    'Propellers'
  );

insert into public.ccat_items (category_id, name, sort_order)
select category.id, lecture.name, lecture.sort_order
from public.ccat_categories as category
join (
  values
    ('Aeroscience', 1),
    ('The Atmosphere', 2),
    ('ISA', 3),
    ('Lift', 4),
    ('Drag', 5),
    ('Stability', 6),
    ('Manoeuvres', 7),
    ('Straight & Level', 8),
    ('Climbing & Descending turns', 9),
    ('Climbing', 10),
    ('Descending', 11),
    ('Stalling', 12),
    ('Wing Drops', 13),
    ('Lift:Drag Ratio', 14),
    ('Ideal Aerofoil', 15),
    ('Lift Augmentation', 16),
    ('Flight Controls & Balancing', 17),
    ('Tabs', 18),
    ('Max Rate Turns', 19),
    ('Aspect Ratio', 20),
    ('Angle of Climb', 21),
    ('Rate of Climb', 22),
    ('Range', 23),
    ('Endurance', 24),
    ('Propellers', 25)
) as lecture(name, sort_order) on true
where category.key = 'pof'
  and not exists (
    select 1
    from public.ccat_items as existing
    where existing.category_id = category.id
      and existing.name = lecture.name
  );

update public.ccat_items as item
set sort_order = lecture.sort_order,
    is_active = true
from public.ccat_categories as category
join (
  values
    ('Aeroscience', 1),
    ('The Atmosphere', 2),
    ('ISA', 3),
    ('Lift', 4),
    ('Drag', 5),
    ('Stability', 6),
    ('Manoeuvres', 7),
    ('Straight & Level', 8),
    ('Climbing & Descending turns', 9),
    ('Climbing', 10),
    ('Descending', 11),
    ('Stalling', 12),
    ('Wing Drops', 13),
    ('Lift:Drag Ratio', 14),
    ('Ideal Aerofoil', 15),
    ('Lift Augmentation', 16),
    ('Flight Controls & Balancing', 17),
    ('Tabs', 18),
    ('Max Rate Turns', 19),
    ('Aspect Ratio', 20),
    ('Angle of Climb', 21),
    ('Rate of Climb', 22),
    ('Range', 23),
    ('Endurance', 24),
    ('Propellers', 25)
) as lecture(name, sort_order) on true
where item.category_id = category.id
  and category.key = 'pof'
  and item.name = lecture.name
  and (item.sort_order is distinct from lecture.sort_order or item.is_active is distinct from true);
