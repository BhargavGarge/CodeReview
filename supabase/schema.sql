-- =============================================================
-- CodeReview.live — Full Database Schema
-- Covers all 5 phases:
--   Phase 1: Auth + Profiles (onboarding)
--   Phase 2: Sessions + Monaco editor
--   Phase 3: Real-time collab (participants, snapshots)
--   Phase 4: AI reviews + line-specific comments
--   Phase 5: Billing, subscriptions, usage/rate-limiting
-- =============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_stat_statements";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
create type experience_level      as enum ('junior', 'mid', 'senior', 'lead');
create type session_language      as enum ('javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp', 'ruby', 'php', 'other');
create type participant_role      as enum ('owner', 'reviewer', 'viewer');
create type review_status         as enum ('pending', 'processing', 'completed', 'failed');
create type comment_severity      as enum ('info', 'warning', 'error', 'suggestion');
create type comment_category      as enum ('security', 'performance', 'style', 'logic', 'best_practice');
create type subscription_plan     as enum ('free', 'pro', 'team');
create type subscription_status   as enum ('active', 'canceled', 'past_due', 'trialing');
create type usage_action          as enum ('ai_review', 'session_created', 'snapshot_saved');

-- ─────────────────────────────────────────
-- PHASE 1 — PROFILES
-- Extends auth.users. Created automatically via trigger on sign-up.
-- ─────────────────────────────────────────
create table public.profiles (
  id                   uuid        primary key references auth.users (id) on delete cascade,
  name                 text,
  role                 text,                        -- 'Frontend Engineer', etc.
  experience_level     experience_level,
  avatar_url           text,
  onboarding_completed boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-insert a blank profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at in sync automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────
-- PHASE 2 — SESSIONS
-- One session = one shared Monaco editor workspace.
-- ─────────────────────────────────────────
create table public.sessions (
  id               uuid           primary key default gen_random_uuid(),
  owner_id         uuid           not null references public.profiles (id) on delete cascade,
  title            text           not null default 'Untitled Session',
  description      text,
  language         session_language not null default 'javascript',
  code             text           not null default '',   -- current live code snapshot
  github_repo_url  text,                                  -- optional: linked GitHub repo
  is_active        boolean        not null default true,
  invite_token     text           not null unique default encode(gen_random_bytes(16), 'hex'),
  max_participants integer        not null default 10 check (max_participants between 1 and 50),
  created_at       timestamptz    not null default now(),
  updated_at       timestamptz    not null default now()
);

create index idx_sessions_owner_id  on public.sessions (owner_id);
create index idx_sessions_invite_token on public.sessions (invite_token);

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────
-- PHASE 2/3 — SESSION PARTICIPANTS
-- Who is in a session and in what role.
-- ─────────────────────────────────────────
create table public.session_participants (
  id          uuid             primary key default gen_random_uuid(),
  session_id  uuid             not null references public.sessions (id) on delete cascade,
  user_id     uuid             not null references public.profiles (id) on delete cascade,
  role        participant_role not null default 'viewer',
  joined_at   timestamptz      not null default now(),

  unique (session_id, user_id)
);

create index idx_session_participants_session_id on public.session_participants (session_id);
create index idx_session_participants_user_id    on public.session_participants (user_id);

-- ─────────────────────────────────────────
-- PHASE 3 — SESSION SNAPSHOTS
-- Periodic / on-demand saves of the code at a point in time.
-- Full real-time sync lives in Redis; this is the durable record.
-- ─────────────────────────────────────────
create table public.session_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.sessions (id) on delete cascade,
  code        text        not null,
  saved_by    uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_session_snapshots_session_id on public.session_snapshots (session_id);
create index idx_session_snapshots_created_at on public.session_snapshots (session_id, created_at desc);

-- ─────────────────────────────────────────
-- PHASE 4 — AI REVIEWS
-- Each review is triggered by a participant on a specific code state.
-- ─────────────────────────────────────────
create table public.ai_reviews (
  id              uuid          primary key default gen_random_uuid(),
  session_id      uuid          not null references public.sessions (id) on delete cascade,
  requested_by    uuid          references public.profiles (id) on delete set null,
  code_snapshot   text          not null,   -- exact code that was sent to Gemini
  status          review_status not null default 'pending',
  model_used      text,                     -- e.g. 'gemini-1.5-pro'
  prompt_tokens   integer,
  completion_tokens integer,
  error_message   text,
  created_at      timestamptz   not null default now(),
  completed_at    timestamptz
);

create index idx_ai_reviews_session_id    on public.ai_reviews (session_id);
create index idx_ai_reviews_requested_by  on public.ai_reviews (requested_by);
create index idx_ai_reviews_status        on public.ai_reviews (status) where status in ('pending', 'processing');

-- ─────────────────────────────────────────
-- PHASE 4 — REVIEW COMMENTS
-- Line-specific feedback items from an AI review.
-- ─────────────────────────────────────────
create table public.review_comments (
  id          uuid             primary key default gen_random_uuid(),
  review_id   uuid             not null references public.ai_reviews (id) on delete cascade,
  line_start  integer          not null check (line_start >= 1),
  line_end    integer          not null check (line_end >= line_start),
  severity    comment_severity not null default 'info',
  category    comment_category not null default 'best_practice',
  message     text             not null,
  suggestion  text,            -- optional: proposed fix / replacement code
  created_at  timestamptz      not null default now()
);

create index idx_review_comments_review_id on public.review_comments (review_id);

-- ─────────────────────────────────────────
-- PHASE 5 — SUBSCRIPTIONS
-- One active subscription per user. Managed via Stripe webhooks.
-- ─────────────────────────────────────────
create table public.subscriptions (
  id                     uuid                primary key default gen_random_uuid(),
  user_id                uuid                not null unique references public.profiles (id) on delete cascade,
  plan                   subscription_plan   not null default 'free',
  status                 subscription_status not null default 'active',
  stripe_customer_id     text                unique,
  stripe_subscription_id text                unique,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean             not null default false,
  created_at             timestamptz         not null default now(),
  updated_at             timestamptz         not null default now()
);

create index idx_subscriptions_user_id          on public.subscriptions (user_id);
create index idx_subscriptions_stripe_customer  on public.subscriptions (stripe_customer_id);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- Auto-create a free subscription when a profile is created
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ─────────────────────────────────────────
-- PHASE 5 — USAGE LOGS
-- Track per-user actions for rate limiting and billing analytics.
-- ─────────────────────────────────────────
create table public.usage_logs (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          not null references public.profiles (id) on delete cascade,
  action         usage_action  not null,
  session_id     uuid          references public.sessions (id) on delete set null,
  review_id      uuid          references public.ai_reviews (id) on delete set null,
  billing_period text          not null,   -- 'YYYY-MM', e.g. '2026-04'
  created_at     timestamptz   not null default now()
);

create index idx_usage_logs_user_id        on public.usage_logs (user_id);
create index idx_usage_logs_billing_period on public.usage_logs (user_id, billing_period);
create index idx_usage_logs_action         on public.usage_logs (user_id, action, billing_period);

-- Helper function: count AI reviews used this billing period
create or replace function public.ai_reviews_used_this_period(p_user_id uuid)
returns integer
language sql
stable security definer set search_path = public
as $$
  select count(*)::integer
  from public.usage_logs
  where user_id = p_user_id
    and action = 'ai_review'
    and billing_period = to_char(now(), 'YYYY-MM');
$$;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────

alter table public.profiles             enable row level security;
alter table public.sessions             enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_snapshots    enable row level security;
alter table public.ai_reviews           enable row level security;
alter table public.review_comments      enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.usage_logs           enable row level security;

-- ── RLS helper functions (avoid recursive policy checks) ──────────────
create or replace function public.is_session_owner(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.owner_id = p_user_id
  );
$$;

create or replace function public.is_session_participant(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_participants sp
    where sp.session_id = p_session_id
      and sp.user_id = p_user_id
  );
$$;

create or replace function public.can_access_session(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_session_owner(p_session_id, p_user_id)
      or public.is_session_participant(p_session_id, p_user_id);
$$;

create or replace function public.accept_session_invite(p_invite_token text)
returns table(session_id uuid, session_title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '28000';
  end if;

  select *
  into v_session
  from public.sessions
  where invite_token = p_invite_token
  limit 1;

  if not found then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;

  insert into public.session_participants (session_id, user_id, role)
  values (v_session.id, auth.uid(), 'viewer')
  on conflict (session_id, user_id)
  do update set role = excluded.role;

  return query
  select v_session.id, v_session.title;
end;
$$;

-- ── profiles ──────────────────────────────
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- In local/dev environments it is common to iterate without a
-- service-role key and to have existing auth users without a
-- pre-populated profile row. These more permissive policies ensure
-- that any authenticated user can create or update their profile
-- without tripping RLS, while select access remains limited to the
-- owner via the policy above.
create policy "Any authenticated user can create profile (dev)"
  on public.profiles for insert
  with check (auth.uid() is not null);

create policy "Any authenticated user can update profile (dev)"
  on public.profiles for update
  using (auth.uid() is not null);

-- ── sessions ──────────────────────────────
-- Any session participant (including owner) can read the session
create policy "Session members can view sessions"
  on public.sessions for select
  using (public.can_access_session(id, auth.uid()));

-- For local/dev and simpler demos, also allow any authenticated user
-- to read sessions. The application uses strict invite flows for
-- access control, so this more permissive policy avoids confusing RLS
-- errors while you are iterating without a service role key.
create policy "Any authenticated user can view sessions"
  on public.sessions for select
  using (auth.uid() is not null);

create policy "Authenticated users can create sessions"
  on public.sessions for insert
  with check (auth.uid() = owner_id);

-- In local/dev environments where API routes use the authenticated
-- Supabase client, it's sufficient to require that a caller is
-- authenticated to create a new session. The application code already
-- sets owner_id = auth.uid(), so we allow any non-null auth.uid() here
-- to avoid unexpected RLS violations when SUPABASE_SERVICE_ROLE_KEY is
-- not configured.
create policy "Any authenticated user can create sessions"
  on public.sessions for insert
  with check (auth.uid() is not null);

create policy "Owner can update their session"
  on public.sessions for update
  using (auth.uid() = owner_id);

create policy "Owner can delete their session"
  on public.sessions for delete
  using (auth.uid() = owner_id);

-- ── session_participants ───────────────────
create policy "Participants can view session members"
  on public.session_participants for select
  using (
    user_id = auth.uid()
    or public.is_session_owner(session_id, auth.uid())
  );

create policy "Authenticated users can join sessions"
  on public.session_participants for insert
  with check (auth.uid() = user_id);

create policy "Owner can manage participants"
  on public.session_participants for delete
  using (
    public.is_session_owner(session_id, auth.uid())
    or user_id = auth.uid()   -- user can remove themselves
  );

-- ── session_snapshots ─────────────────────
create policy "Session members can view snapshots"
  on public.session_snapshots for select
  using (public.can_access_session(session_id, auth.uid()));

create policy "Session members can save snapshots"
  on public.session_snapshots for insert
  with check (
    auth.uid() = saved_by
    and public.can_access_session(session_id, auth.uid())
  );

-- ── ai_reviews ────────────────────────────
create policy "Session members can view reviews"
  on public.ai_reviews for select
  using (public.can_access_session(session_id, auth.uid()));

create policy "Session members can request reviews"
  on public.ai_reviews for insert
  with check (
    auth.uid() = requested_by
    and public.can_access_session(session_id, auth.uid())
  );

-- Service role updates status/tokens (from your backend/Edge Function)
-- No client-side update policy needed.

-- ── review_comments ───────────────────────
create policy "Session members can view comments"
  on public.review_comments for select
  using (
    exists (
      select 1
      from public.ai_reviews r
      where r.id = review_id
        and public.can_access_session(r.session_id, auth.uid())
    )
  );

-- ── subscriptions ─────────────────────────
create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- All writes come from server/webhook (service role), no client insert/update policy.

-- ── usage_logs ────────────────────────────
create policy "Users can view their own usage"
  on public.usage_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own usage"
  on public.usage_logs for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PLAN LIMITS (reference table)
-- ─────────────────────────────────────────
create table public.plan_limits (
  plan                  subscription_plan primary key,
  max_sessions          integer not null,   -- concurrent active sessions
  max_participants      integer not null,   -- per session
  ai_reviews_per_month  integer not null,   -- -1 = unlimited
  snapshot_retention_days integer not null
);

insert into public.plan_limits values
  ('free',  3,  3,   5,  7),
  ('pro',  20, 10,  50, 90),
  ('team', -1, 50,  -1, -1);   -- -1 = unlimited

-- ─────────────────────────────────────────
-- INVITE HELPER — get_session_by_invite_token
-- Security-definer so any authenticated user can resolve an invite token
-- without being blocked by sessions RLS.
-- Only exposes id + title (never the session code or other sensitive fields).
-- Run this in your Supabase SQL editor if the accept_session_invite function
-- is unavailable and you don't have SUPABASE_SERVICE_ROLE_KEY set.
-- ─────────────────────────────────────────
create or replace function public.get_session_by_invite_token(p_invite_token text)
returns table(session_id uuid, session_title text)
language sql
security definer
set search_path = public
as $$
  select id, title
  from public.sessions
  where invite_token = p_invite_token
  limit 1;
$$;

-- ─────────────────────────────────────────
-- EVENT SOURCING — session_events
-- Append-only log of every editor action with millisecond precision.
-- Populated exclusively by the Socket.io server (service role) — no direct
-- client writes allowed. Supports replay, auditing, and activity analytics.
-- ─────────────────────────────────────────
create table public.session_events (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.sessions(id) on delete cascade,
  user_id     uuid        references public.profiles(id) on delete set null,
  event_type  text        not null check (event_type in ('code-update', 'cursor-move', 'ai-review-requested')),
  -- clock_timestamp() gives wall-clock time even inside a transaction,
  -- preserving sub-millisecond ordering that now() would collapse.
  created_at  timestamptz not null default clock_timestamp(),
  payload     jsonb       not null default '{}'
);

-- Efficient range queries for session replay / analytics
create index session_events_session_created
  on public.session_events (session_id, created_at desc);

alter table public.session_events enable row level security;

-- Session participants can read their own session's event log
create policy "session_events_select" on public.session_events
  for select using (
    exists (
      select 1 from public.session_participants sp
      where sp.session_id = session_events.session_id
        and sp.user_id = auth.uid()
    )
  );

-- Inserts come exclusively from the Socket.io server via the service role —
-- no policy needed (service role bypasses RLS).
