-- ============================================================================
-- CSDC SYNAPSE — SUPABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- Enable UUID extension (already enabled on Supabase, just in case)
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. APPLICATIONS
-- Stores membership requests from the registration page.
-- Status: pending → approved → rejected
-- On approval, a row is created in `members`.
-- ============================================================================
create table if not exists applications (
  id              uuid primary key default uuid_generate_v4(),
  first_name      text not null,
  last_name       text not null,
  email           text not null unique,
  phone           text not null,
  year            smallint not null check (year between 1 and 3),
  section         text not null check (section in ('A','B','C')),
  password_hash   text not null,
  linkedin        text not null,
  github          text not null,
  tshirt_size     text not null check (tshirt_size in ('S','M','L','XL','XXL')),
  why_join        text not null,
  suggestions     text default '',
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  invite_sent_at  timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists applications_email_idx  on applications(email);
create index if not exists applications_status_idx on applications(status);

-- ============================================================================
-- 2. MEMBERS
-- Created when an application is approved and the user completes onboarding.
-- The `encrypted_uid` is what gets written to the NFC card.
-- ============================================================================
create table if not exists members (
  id                uuid primary key default uuid_generate_v4(),
  auth_user_id      uuid unique references auth.users(id) on delete cascade,
  application_id    uuid unique references applications(id) on delete set null,

  -- Identity
  first_name        text not null,
  last_name         text not null,
  email             text not null unique,
  phone             text not null,
  year              smallint not null check (year between 1 and 3),
  section           text not null check (section in ('A','B','C')),
  batch_year        smallint not null,   -- e.g. 2024 — used for alumni conversion

  -- NFC
  raw_uid           text unique,         -- UUID4, server-side only, never on card
  encrypted_uid     text unique,         -- AES-256 Fernet token written to NFC card

  -- Profile
  avatar_url        text,
  bio               text default '',
  linkedin          text not null,
  github            text not null,
  skills            text[] default '{}',

  -- T-shirt
  tshirt_size       text not null check (tshirt_size in ('S','M','L','XL','XXL')),
  tshirt_dispatched boolean not null default false,

  -- Visibility
  visibility_mode   text not null default 'public'
                      check (visibility_mode in ('public','networking','ghost')),

  -- Gamification
  xp                integer not null default 0,
  member_archetype  text,               -- 'builder' | 'scholar' | 'connector' etc.

  -- Alumni
  is_alumni         boolean not null default false,
  alumni_since      timestamptz,

  -- Role
  role              text not null default 'member'
                      check (role in ('member','lead','alumni','coordinator')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists members_email_idx         on members(email);
create index if not exists members_encrypted_uid_idx on members(encrypted_uid);
create index if not exists members_batch_year_idx    on members(batch_year);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger members_updated_at
  before update on members
  for each row execute function update_updated_at();

-- ============================================================================
-- 3. WORKSHOPS
-- Each event/workshop the club conducts.
-- ============================================================================
create table if not exists workshops (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  description     text default '',
  conducted_by    uuid references members(id) on delete set null,
  scheduled_at    timestamptz not null,
  ended_at        timestamptz,
  location        text default '',
  xp_for_attend   integer not null default 50,   -- XP awarded for attending
  late_penalty    integer not null default 10,    -- XP deducted for late tap
  late_threshold  interval not null default '15 minutes',
  is_active       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 4. ATTENDANCE
-- Each NFC tap-in at a workshop entrance.
-- ============================================================================
create table if not exists attendance (
  id            uuid primary key default uuid_generate_v4(),
  member_id     uuid not null references members(id) on delete cascade,
  workshop_id   uuid not null references workshops(id) on delete cascade,
  tapped_at     timestamptz not null default now(),
  is_late       boolean not null default false,
  xp_awarded    integer not null default 0,
  unique (member_id, workshop_id)   -- one tap per member per workshop
);

create index if not exists attendance_member_idx   on attendance(member_id);
create index if not exists attendance_workshop_idx on attendance(workshop_id);

-- ============================================================================
-- 5. XP LEDGER
-- Every XP transaction (earn or spend) is logged here.
-- ============================================================================
create table if not exists xp_ledger (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  delta       integer not null,             -- positive = earned, negative = spent/penalty
  reason      text not null,               -- 'workshop_attend' | 'task_complete' | 'feedback' | 'manual' etc.
  ref_id      uuid,                         -- optional: workshop_id, task_id, etc.
  awarded_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists xp_ledger_member_idx on xp_ledger(member_id);

-- Auto-update members.xp when ledger changes
create or replace function sync_member_xp()
returns trigger language plpgsql as $$
begin
  update members
  set xp = xp + new.delta
  where id = new.member_id;
  return new;
end;
$$;

create trigger xp_ledger_sync
  after insert on xp_ledger
  for each row execute function sync_member_xp();

-- ============================================================================
-- 6. BADGES
-- Badge definitions and the junction table for member awards.
-- ============================================================================
create table if not exists badge_definitions (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null unique,       -- 'first_tap' | 'commit_streak' etc.
  name         text not null,
  description  text not null,
  icon         text not null,              -- emoji or icon name
  xp_threshold integer,                    -- auto-award when member hits this XP
  is_manual    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists member_badges (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  badge_id    uuid not null references badge_definitions(id) on delete cascade,
  awarded_by  uuid references members(id) on delete set null,
  awarded_at  timestamptz not null default now(),
  unique (member_id, badge_id)
);

create index if not exists member_badges_member_idx on member_badges(member_id);

-- ============================================================================
-- 7. TASKS
-- Tasks assigned during workshops. Members submit via GitHub repo.
-- ============================================================================
create table if not exists tasks (
  id              uuid primary key default uuid_generate_v4(),
  workshop_id     uuid not null references workshops(id) on delete cascade,
  title           text not null,
  description     text default '',
  type            text not null default 'github'
                    check (type in ('github','manual','form')),
  max_xp          integer not null default 100,
  due_at          timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists task_submissions (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid not null references tasks(id) on delete cascade,
  member_id       uuid not null references members(id) on delete cascade,
  github_repo_url text,
  commit_sha      text,
  score           integer,             -- out of task.max_xp, set by lead after review
  xp_awarded      integer default 0,
  reviewed_by     uuid references members(id) on delete set null,
  reviewed_at     timestamptz,
  status          text not null default 'submitted'
                    check (status in ('submitted','approved','rejected')),
  submitted_at    timestamptz not null default now(),
  unique (task_id, member_id)
);

-- ============================================================================
-- 8. FEEDBACK
-- Anonymous 3-question exit feedback after workshops.
-- UID used only to validate membership (not stored with responses).
-- ============================================================================
create table if not exists feedback (
  id            uuid primary key default uuid_generate_v4(),
  workshop_id   uuid not null references workshops(id) on delete cascade,
  -- We store a hashed member_id so we can prevent duplicates but not identify
  member_hash   text not null,
  q1_rating     smallint check (q1_rating between 1 and 5),
  q2_rating     smallint check (q2_rating between 1 and 5),
  q3_text       text,
  submitted_at  timestamptz not null default now(),
  unique (workshop_id, member_hash)
);

-- ============================================================================
-- 9. VOTES
-- One card tap = one verified vote per poll.
-- ============================================================================
create table if not exists polls (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text default '',
  options     jsonb not null default '[]',   -- [{id, label}]
  created_by  uuid references members(id) on delete set null,
  closes_at   timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists votes (
  id          uuid primary key default uuid_generate_v4(),
  poll_id     uuid not null references polls(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  option_id   text not null,
  voted_at    timestamptz not null default now(),
  unique (poll_id, member_id)   -- one vote per member per poll
);

-- ============================================================================
-- 10. RESOURCES (VAULT)
-- Code modules, repos, and projects uploaded by leads/alumni.
-- ============================================================================
create table if not exists resources (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text default '',
  type          text not null check (type in ('repo','module','project','other')),
  url           text not null,
  uploaded_by   uuid references members(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 11. INVITE TOKENS
-- One-time tokens emailed to approved applicants for onboarding.
-- ============================================================================
create table if not exists invite_tokens (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid not null unique references applications(id) on delete cascade,
  token           text not null unique,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- SEED: Badge Definitions
-- ============================================================================
insert into badge_definitions (slug, name, description, icon, xp_threshold, is_manual) values
  ('first_tap',       'First Tap',          'Tapped in to your first workshop',             '⚡', null,  false),
  ('early_bird',      'Early Bird',          'Arrived on time 3 workshops in a row',         '🌅', null,  false),
  ('streak_3',        'On a Roll',           'Attended 3 consecutive workshops',             '🔥', null,  false),
  ('streak_5',        'Unstoppable',         'Attended 5 consecutive workshops',             '🚀', null,  false),
  ('commit_first',    'First Commit',        'Submitted your first GitHub task',             '💾', null,  false),
  ('commit_streak',   'Commit Streak',       'Submitted GitHub tasks 3 workshops in a row',  '🧑‍💻', null,  false),
  ('xp_100',         'Century',             'Earned 100 XP',                                '💯', 100,   false),
  ('xp_500',         'High Achiever',       'Earned 500 XP',                                '🏆', 500,   false),
  ('xp_1000',        'Legend',              'Earned 1000 XP',                               '👑', 1000,  false),
  ('feedback_hero',   'Voice of the Club',  'Submitted feedback for 5 workshops',            '📣', null,  false),
  ('top_leaderboard', 'Top of the Board',   'Reached #1 on the leaderboard',                '🥇', null,  true),
  ('mentor',          'Mentor',             'Accepted a mentorship request as alumni',       '🎓', null,  true),
  ('builder',         'The Builder',        'Archetype: consistently submits projects',      '🔨', null,  true),
  ('scholar',         'The Scholar',        'Archetype: highest task scores',               '📚', null,  true),
  ('connector',       'The Connector',      'Archetype: most contact shares',               '🔗', null,  true)
on conflict (slug) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Applications: only service role can read (leads use admin dashboard)
alter table applications enable row level security;
create policy "service_role_only" on applications
  using (auth.role() = 'service_role');

-- Members: public profiles visible to all; private data only to owner or leads
alter table members enable row level security;
create policy "public_profiles" on members
  for select using (visibility_mode = 'public');
create policy "own_profile" on members
  for all using (auth_user_id = auth.uid());

-- Attendance: members see their own
alter table attendance enable row level security;
create policy "own_attendance" on attendance
  for select using (
    member_id = (select id from members where auth_user_id = auth.uid())
  );

-- XP ledger: members see their own
alter table xp_ledger enable row level security;
create policy "own_xp" on xp_ledger
  for select using (
    member_id = (select id from members where auth_user_id = auth.uid())
  );

-- Badges: public read
alter table badge_definitions enable row level security;
create policy "public_read_badges" on badge_definitions for select using (true);
alter table member_badges enable row level security;
create policy "public_read_member_badges" on member_badges for select using (true);

-- Resources: authenticated members only
alter table resources enable row level security;
create policy "members_read_resources" on resources
  for select using (auth.role() = 'authenticated');

-- Polls/votes: authenticated members
alter table polls enable row level security;
create policy "members_read_polls" on polls
  for select using (auth.role() = 'authenticated');
alter table votes enable row level security;
create policy "own_votes" on votes
  for select using (
    member_id = (select id from members where auth_user_id = auth.uid())
  );
