-- Add the wing-drop stall lecture after Factors of Stall.

update public.ccat_items as item
set sort_order = item.sort_order + 1
from public.ccat_categories as category
where item.category_id = category.id
  and category.key = 'pof'
  and item.sort_order >= 11
  and not exists (
    select 1
    from public.ccat_items as existing
    join public.ccat_categories as existing_category on existing_category.id = existing.category_id
    where existing_category.key = 'pof'
      and existing.name = 'Wing Drop Stalls'
  );

insert into public.ccat_items (category_id, name, sort_order)
select category.id, 'Wing Drop Stalls', 11
from public.ccat_categories as category
where category.key = 'pof'
  and not exists (
    select 1
    from public.ccat_items as existing
    where existing.category_id = category.id
      and existing.name = 'Wing Drop Stalls'
  );
