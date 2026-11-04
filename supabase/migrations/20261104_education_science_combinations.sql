-- Seed the Bachelor of Education Science course combinations.
-- Safe to run more than once.
insert into public.courses (name, description)
values ('Bachelor of Education Science', 'Bachelor of Education Science programme')
on conflict (name) do nothing;

insert into public.combinations (course_id, name, description)
select c.id, option.name, 'Bachelor of Education Science subject combination'
from public.courses c
cross join (values
  ('Math/Chem'),
  ('Math/Physics'),
  ('Math/Bio'),
  ('Bio/Chem'),
  ('Chem/Physics')
) as option(name)
where c.name = 'Bachelor of Education Science'
  and not exists (
    select 1 from public.combinations existing
    where existing.course_id = c.id and existing.name = option.name
  );
