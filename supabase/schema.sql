-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  role text not null default 'STUDENT',
  xp integer not null default 0,
  streak integer not null default 0,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    coalesce(new.raw_user_meta_data->>'role', 'STUDENT')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Courses
create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  color text default '#58CC02',
  published boolean default false,
  created_at timestamptz default now()
);

-- Units
create table if not exists units (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  description text,
  "order" integer not null default 0,
  created_at timestamptz default now()
);

-- Lessons
create table if not exists lessons (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slides jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Quizzes
create table if not exists quizzes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  lesson_id uuid references lessons(id) on delete set null,
  created_at timestamptz default now()
);

-- Path Spots
create table if not exists path_spots (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references units(id) on delete cascade not null,
  type text not null check (type in ('LESSON', 'QUIZ')),
  lesson_id uuid references lessons(id) on delete set null,
  quiz_id uuid references quizzes(id) on delete set null,
  "order" integer not null default 0
);

-- Questions
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references quizzes(id) on delete cascade not null,
  type text not null,
  prompt jsonb not null,
  answers jsonb not null,
  correct_answer jsonb not null,
  "order" integer not null default 0
);

-- Quiz Attempts
create table if not exists quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  quiz_id uuid references quizzes(id) on delete cascade not null,
  score integer not null default 0,
  total_questions integer not null default 0,
  passed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Question Attempts
create table if not exists question_attempts (
  id uuid default gen_random_uuid() primary key,
  attempt_id uuid references quiz_attempts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  user_answer jsonb not null,
  correct boolean not null,
  first_try boolean not null default true
);

-- Enrollments
create table if not exists enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

-- Progress
create table if not exists progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  path_spot_id uuid references path_spots(id) on delete cascade not null,
  completed boolean not null default false,
  score integer,
  completed_at timestamptz,
  unique(user_id, path_spot_id)
);

-- Grant full access to service_role (it bypasses RLS but still needs table privileges)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Enable RLS on all tables (service role key bypasses this; blocks direct anon access)
alter table profiles enable row level security;
alter table courses enable row level security;
alter table units enable row level security;
alter table lessons enable row level security;
alter table quizzes enable row level security;
alter table path_spots enable row level security;
alter table questions enable row level security;
alter table quiz_attempts enable row level security;
alter table question_attempts enable row level security;
alter table enrollments enable row level security;
alter table progress enable row level security;
