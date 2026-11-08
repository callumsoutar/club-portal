-- Replace the ground-knowledge placeholder with the paper syllabus topics.
-- Order follows the sheet: the law section, then Table 3.

delete from public.ccat_items as item
using public.ccat_categories as category
where item.category_id = category.id
  and category.key = 'ground'
  and item.name = 'Ground knowledge (placeholder)'
  and not exists (
    select 1 from public.ccat_events as event where event.item_id = item.id
  )
  and not exists (
    select 1 from public.ccat_plan_items as plan_item where plan_item.item_id = item.id
  );

insert into public.ccat_items (category_id, name, sort_order)
select category.id, topic.name, topic.sort_order
from public.ccat_categories as category
join (
  values
    ('General', 1),
    ('Aircraft Requirements', 2),
    ('Pilot Requirements', 3),
    ('Advisory Circulars', 4),
    ('Supervision', 5),
    ('1:60', 6),
    ('Ground Speed', 7),
    ('Airspace', 8),
    ('Lost Procedure', 9),
    ('Map Projections', 10),
    ('Aircraft Documents', 11),
    ('Performance AC91-3', 12),
    ('P Charts', 13),
    ('P Tables', 14),
    ('Weight & Balance', 15),
    ('Fronts', 16),
    ('Fohn Winds', 17),
    ('Sea Breeze', 18),
    ('Go Pre Flight', 19),
    ('Aircraft Pre Flight Inspection', 20)
) as topic(name, sort_order) on true
where category.key = 'ground'
  and not exists (
    select 1
    from public.ccat_items as existing
    where existing.category_id = category.id
      and existing.name = topic.name
  );
