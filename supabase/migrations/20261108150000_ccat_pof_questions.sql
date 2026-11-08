-- Oral POF question bank for C Cat students.

create table public.ccat_question_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_question_topics_name_not_blank check (length(btrim(name)) > 0),
  constraint ccat_question_topics_sort_positive check (sort_order > 0),
  constraint ccat_question_topics_name_unique unique (name),
  constraint ccat_question_topics_sort_unique unique (sort_order)
);

create table public.ccat_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.ccat_question_topics (id) on delete restrict,
  number integer not null,
  prompt text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_questions_prompt_not_blank check (length(btrim(prompt)) > 0),
  constraint ccat_questions_number_positive check (number > 0),
  constraint ccat_questions_sort_positive check (sort_order > 0),
  constraint ccat_questions_number_unique unique (number),
  constraint ccat_questions_topic_sort_unique unique (topic_id, sort_order)
);

create index ccat_questions_topic_idx on public.ccat_questions (topic_id, sort_order);

create trigger trg_ccat_question_topics_updated_at
  before update on public.ccat_question_topics
  for each row execute function public.set_updated_at();

create trigger trg_ccat_questions_updated_at
  before update on public.ccat_questions
  for each row execute function public.set_updated_at();

alter table public.ccat_question_topics enable row level security;
alter table public.ccat_questions enable row level security;

create policy "ccat_question_topics: read"
  on public.ccat_question_topics for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.ccat_students as student
      where student.profile_id = (select auth.uid())
    )
  );

create policy "ccat_question_topics: admin write"
  on public.ccat_question_topics for all to authenticated
  using (public.is_flight_admin())
  with check (public.is_flight_admin());

create policy "ccat_questions: read"
  on public.ccat_questions for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.ccat_students as student
      where student.profile_id = (select auth.uid())
    )
  );

create policy "ccat_questions: admin write"
  on public.ccat_questions for all to authenticated
  using (public.is_flight_admin())
  with check (public.is_flight_admin());

grant select, insert, update, delete on public.ccat_question_topics to authenticated;
grant select, insert, update, delete on public.ccat_questions to authenticated;

insert into public.ccat_question_topics (name, sort_order)
values
  ('Lift and the aerofoil', 1),
  ('Flaps and lift augmentation', 2),
  ('Drag', 3),
  ('Stalling', 4),
  ('Stability', 5),
  ('Controls, balances and tabs', 6),
  ('Forces, couples and tailplane', 7),
  ('Newton''s laws, equilibrium and basic physics', 8),
  ('Turning', 9),
  ('Climbing', 10),
  ('Gliding and descending', 11),
  ('Range and endurance', 12),
  ('Propellers', 13);

insert into public.ccat_questions (topic_id, number, sort_order, prompt)
select topic.id, question.number, question.sort_order, question.prompt
from public.ccat_question_topics as topic
join (
  values
    (1, 1, 1, 'What is lift and how is it achieved?'),
    (1, 2, 2, 'How is lift produced?'),
    (1, 3, 3, 'Explain Bernoulli''s Theorem.'),
    (1, 4, 4, 'What factors affect lift?'),
    (1, 5, 5, 'Is there a formula for lift? What is it and its components?'),
    (1, 6, 6, 'Factors affecting CL.'),
    (1, 7, 7, 'What is CL, how can it be represented graphically? Why represent it against AoA?'),
    (1, 8, 8, 'Draw the CL vs AoA graph (and explain what happens when we extend flap and change surface condition).'),
    (1, 9, 9, 'How does the lift coefficient vary with angle of attack?'),
    (1, 10, 10, 'How does aspect ratio affect CL vs AoA?'),
    (1, 11, 11, 'What happens to geometric AoA when we extend flap? What about effective AoA?'),
    (1, 12, 12, 'How does CoP move with changes in angle of attack?'),
    (1, 13, 13, 'Why is there still lift produced at a negative angle of attack?'),
    (1, 14, 14, 'Is there any type of aerofoil that does not produce lift at 0 degrees?'),
    (1, 15, 15, 'Why do we use an aerofoil for our wings and not a flat plate?'),
    (1, 16, 16, 'What are the properties of the ideal aerofoil? Which can''t be found together?'),
    (1, 17, 17, 'Describe upwash and downwash.'),
    (1, 18, 18, 'What is aspect ratio?'),
    (1, 19, 19, 'What is stagger and why do some aircraft have it?'),
    (1, 20, 20, 'What are the advantages of swept wings?'),
    (2, 21, 1, 'What do lift augmentation devices do?'),
    (2, 22, 2, 'What type of lift augmentation devices are there?'),
    (2, 23, 3, 'Advantages/disadvantages of TE flaps and slats.'),
    (2, 24, 4, 'What type of flaps does the PA28 have? How do these flaps affect the lift coefficient?'),
    (2, 25, 5, 'Is there another type of flap that affects other things in the lift formula?'),
    (2, 26, 6, 'What effect do flaps have on the stalling angle of an aircraft?'),
    (2, 27, 7, 'Advantages/disadvantages of flap for take-off and initial climb.'),
    (2, 28, 8, 'If I use flap during a glide, won''t I travel further because I have more lift?'),
    (3, 29, 1, 'What is drag?'),
    (3, 30, 2, 'How many types of drag act on our aircraft?'),
    (3, 31, 3, 'What are those types divided into?'),
    (3, 32, 4, 'Why is our drag split into parasite and induced? (Speed)'),
    (3, 33, 5, 'What is the total drag formula? Explain the components of this formula.'),
    (3, 34, 6, 'Factors affecting CD.'),
    (3, 35, 7, 'What angle of attack is min CD? What angle of attack is min drag?'),
    (3, 36, 8, 'CD graph: where is minimum CD? What about total drag? Why is there a difference?'),
    (3, 37, 9, 'What is SFD? Factors affecting SFD (what does speed do?)'),
    (3, 38, 10, 'What aerofoil design should we use to minimise SFD (draw a laminar flow aerofoil and explain)? What would be the stalling characteristics of such an aerofoil?'),
    (3, 39, 11, 'What is interference drag? How is it minimised?'),
    (3, 40, 12, 'Can interference drag be reduced by streamlining of surfaces (e.g. struts, wings, etc)?'),
    (3, 41, 13, 'What is induced drag?'),
    (3, 42, 14, 'How do wingtip vortices cause drag?'),
    (3, 43, 15, 'What is the relationship between airspeed and induced drag?'),
    (3, 44, 16, 'What design measures reduce induced drag?'),
    (3, 45, 17, 'Is reducing induced drag the primary reason for washout?'),
    (4, 46, 1, 'What is a stall?'),
    (4, 47, 2, 'What is AoA? How is this relevant to our stall?'),
    (4, 48, 3, 'What happens when an aerofoil stalls? Does speed affect the stall?'),
    (4, 49, 4, 'New aircraft have different stall speeds associated with different CoG positions stated in their flight manual. Why is it with a rear CoG we can have a lower stall speed?'),
    (4, 50, 5, 'Why does a wing drop during a wing drop stall?'),
    (5, 51, 1, 'Define stability.'),
    (5, 52, 2, 'What do we call stability that is built into the design of the aircraft?'),
    (5, 53, 3, 'What are the three stabilities of an aircraft? Which ones are related?'),
    (5, 54, 4, 'When a stable aircraft is disturbed, e.g. in pitch, what happens for it to regain its flight path?'),
    (5, 55, 5, 'What kind of stability does an aircraft have if it oscillates about its original flight path, but does not get closer or further away from regaining it?'),
    (5, 56, 6, 'What is dihedral? What effect does this have on lateral stability?'),
    (5, 57, 7, 'How does dihedral work?'),
    (5, 58, 8, 'How do keel surfaces increase lateral stability?'),
    (5, 59, 9, 'Why do most low wings have dihedral but high wings normally do not?'),
    (5, 60, 10, 'Why does the Cessna Ag Wagon have a large amount of dihedral compared with the De Havilland Beaver? (High wing vs low wing)'),
    (5, 61, 11, 'What is directional stability? How does it work?'),
    (5, 62, 12, 'Why does the CT4 have a larger fin than the PA28?'),
    (5, 63, 13, 'Why does the aircraft slip?'),
    (5, 64, 14, 'What are the further effects of roll and yaw? Why?'),
    (5, 65, 15, 'Control vs stability trade-off (a Pitts Special).'),
    (6, 66, 1, 'What are the primary controls? What axis does each act around?'),
    (6, 67, 2, 'What is an axis? Do the axes act through a central point?'),
    (6, 68, 3, 'Can we move about more than one axis at a time?'),
    (6, 69, 4, 'What are the ancillary controls?'),
    (6, 70, 5, 'Explain the operation of a trim tab.'),
    (6, 71, 6, 'Is the trim a primary or secondary control?'),
    (6, 72, 7, 'What is the purpose of aerodynamic balance?'),
    (6, 73, 8, 'Describe the purpose of a horn balance.'),
    (6, 74, 9, 'What type of balancing is a horn balance? Is mass balancing the same thing?'),
    (6, 75, 10, 'What is the purpose of the mass balance? Does the mass balance have any aerodynamic effect?'),
    (6, 76, 11, 'Why do some aircraft have mass balances and aerodynamic balances together?'),
    (6, 77, 12, 'Is there a type of tab that moves in the opposite direction to the main control surface?'),
    (6, 78, 13, 'What is the purpose of an anti-balance tab on a stabilator?'),
    (6, 79, 14, 'How does the tab achieve balance on an all-flying tailplane?'),
    (6, 80, 15, 'What is an inset hinge?'),
    (6, 81, 16, 'What is aileron drag? Why does the upgoing wing have more drag?'),
    (6, 82, 17, 'What is adverse yaw and why does it happen?'),
    (6, 83, 18, 'What ways can aileron drag be reduced? Explain how differential ailerons work.'),
    (6, 84, 19, 'What are Frise ailerons? What is their purpose?'),
    (6, 85, 20, 'Does moving the CoG affect controllability? How?'),
    (7, 86, 1, 'Forces/couples in straight and level.'),
    (7, 87, 2, 'In straight and level does the tail produce a force? Why? Is this always the case?'),
    (7, 88, 3, 'What is a couple?'),
    (7, 89, 4, 'An aircraft has a tailplane set at a large angle of incidence; which predominant couple is this compensating for? Is this couple the normal state of affairs?'),
    (7, 90, 5, 'Why would it be advantageous to have a variable incidence tailplane?'),
    (7, 91, 6, 'What are the advantages and disadvantages of a T-tail design?'),
    (7, 92, 7, 'Do the moments change around an aircraft in flight? How do CoP, CoG, CoD and CoT move?'),
    (8, 93, 1, 'State Newton''s 3 laws.'),
    (8, 94, 2, 'Definition of equilibrium. Are we in equilibrium in a turn? What about a climb? And a spin?'),
    (8, 95, 3, 'Are there any reactions in a turn (illustrate Newton''s 3rd law)?'),
    (8, 96, 4, 'What is the difference between momentum and inertia?'),
    (8, 97, 5, 'What is power?'),
    (8, 98, 6, 'What is the effect of increasing altitude on potential energy?'),
    (8, 99, 7, 'What are TAS and IAS? Factors affecting TAS.'),
    (8, 100, 8, 'If the IAS is the same, why do we have a longer landing distance at 6000 ft?'),
    (9, 101, 1, 'Does an aircraft overbank or underbank in a level turn? Does the outer wing have a greater AoA in the level turn?'),
    (9, 102, 2, 'Is there an overbanking or underbanking tendency in a descending turn?'),
    (9, 103, 3, 'In a climbing turn, does the aircraft want to keep banking? Why?'),
    (9, 104, 4, 'Draw the forces in a turn.'),
    (9, 105, 5, 'Why is there a greater requirement for lift in a turn?'),
    (9, 106, 6, 'Why does the speed reduce in a turn?'),
    (9, 107, 7, 'Why do we apply power in a steep turn but not a medium turn?'),
    (9, 108, 8, 'How does speed affect rate and radius of turn?'),
    (10, 109, 1, 'Draw the forces in a climb.'),
    (10, 110, 2, 'What is the magnitude of lift compared to weight in the climb? So why does the aircraft climb if lift is less?'),
    (10, 111, 3, 'What factors affect ROC?'),
    (10, 112, 4, 'What is the angle of climb dependent on?'),
    (10, 113, 5, 'What is the difference between best rate and best angle, and what is best angle dependent on?'),
    (10, 114, 6, 'How do you determine the best ROC speed? How do you determine the best AoC speed? Is this speed higher or lower than best ROC?'),
    (10, 115, 7, 'Does Vy IAS change with altitude?'),
    (10, 116, 8, 'What does the gap between the two lines (Pa/Pr graph) represent? How does this affect a climbing aircraft?'),
    (10, 117, 9, 'Why do we increase power before climbing?'),
    (11, 118, 1, 'What are the forces in a glide descent?'),
    (11, 119, 2, 'What does power do to the glide?'),
    (11, 120, 3, 'What is the glide angle dependent on?'),
    (11, 121, 4, 'Why do we fly best lift to drag ratio in a glide?'),
    (11, 122, 5, 'Does weight affect glide range? Why is glide angle not affected by a change in weight?'),
    (11, 123, 6, 'Does extra drag extend our range in the glide descent? Why/why not?'),
    (11, 124, 7, 'If gliding in a head/tailwind does endurance increase/decrease?'),
    (11, 125, 8, 'Why do aircraft do powered approaches now instead of glide approaches?'),
    (12, 126, 1, 'What speed do we fly at for range? What speed do we fly at for endurance?'),
    (12, 127, 2, 'Why are the speeds for range and endurance different?'),
    (12, 128, 3, 'Why isn''t the min power speed the min drag speed?'),
    (12, 129, 4, 'Draw a power required vs TAS graph. What speed does the bottom of the curve represent?'),
    (12, 130, 5, 'Why don''t we fly at the minimum speed for endurance?'),
    (12, 131, 6, 'How does altitude affect range and endurance?'),
    (12, 132, 7, 'Why do we fly at lowest safe altitude for best endurance?'),
    (12, 133, 8, 'Define full throttle height. Why is it important?'),
    (13, 134, 1, 'How does a propeller produce thrust?'),
    (13, 135, 2, 'Why is the propeller blade twisted?'),
    (13, 136, 3, 'Most efficient part of the propeller (problems with blade tip and blade roots).'),
    (13, 137, 4, 'What is the helix angle?'),
    (13, 138, 5, 'What is the geometric mean pitch?'),
    (13, 139, 6, 'What is slip and what is the best percentage of slip? Why is there slip?'),
    (13, 140, 7, 'What is solidity? How can we change solidity?'),
    (13, 141, 8, 'What are the benefits of increased propeller solidity? What are the disadvantages of increasing blade width?'),
    (13, 142, 9, 'Explain centrifugal twisting moment. Does CTM tend to coarsen or fine the blade?'),
    (13, 143, 10, 'What advantages does a variable pitch propeller give us over a fixed pitch propeller?'),
    (13, 144, 11, 'How can a propeller act as a brake? Draw the forces in a windmilling propeller.'),
    (13, 145, 12, 'Why can a prop overspeed in a steep dive? Is it producing any thrust?'),
    (13, 146, 13, 'Why feather a prop (2 reasons)?'),
    (13, 147, 14, 'Explain gyroscopic effect. Does this only apply to tail draggers?')
) as question(topic_sort, number, sort_order, prompt) on question.topic_sort = topic.sort_order;
