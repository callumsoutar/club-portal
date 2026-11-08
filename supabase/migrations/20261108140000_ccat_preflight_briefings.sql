-- Replace the pre-flight briefing placeholder with one briefing per flight lesson.
-- Names and order match the flight syllabus.

delete from public.ccat_items as item
using public.ccat_categories as category
where item.category_id = category.id
  and category.key = 'briefing'
  and item.name = 'Pre-flight briefing (placeholder)'
  and not exists (
    select 1 from public.ccat_events as event where event.item_id = item.id
  )
  and not exists (
    select 1 from public.ccat_plan_items as plan_item where plan_item.item_id = item.id
  );

insert into public.ccat_items (category_id, name, sort_order)
select category.id, briefing.name, briefing.sort_order
from public.ccat_categories as category
join (
  values
    ('EoC I', 1),
    ('EoC II', 2),
    ('S & L', 3),
    ('C & D', 4),
    ('Med Turns (30° AoB)', 5),
    ('Slow Flight', 6),
    ('Basic Stalling I', 7),
    ('Basic Stalling II', 8),
    ('SOHJ', 9),
    ('FLWOP', 10),
    ('Steep Turns', 11),
    ('Short Field TO & LDG', 12),
    ('Wingdrop Stalls', 13),
    ('Low Flying I', 14),
    ('Low Flying II', 15),
    ('Precautionary Ldgs', 16),
    ('Compass Turns', 17),
    ('Max Rate Turns', 18),
    ('Steep Gliding Turns', 19),
    ('Stalling in a Turn', 20),
    ('Constant Radius Turn', 21),
    ('Circuits 1', 22),
    ('Circuits 2', 23),
    ('Circuits 3', 24),
    ('EFATO / Go-round', 25),
    ('Glide Approach', 26),
    ('Flapless Landings', 27),
    ('Xwind Circuits', 28)
) as briefing(name, sort_order) on true
where category.key = 'briefing'
  and not exists (
    select 1
    from public.ccat_items as existing
    where existing.category_id = category.id
      and existing.name = briefing.name
  );
