-- ============================================================
-- Phase 3: video uploads + timestamped comments
-- Storage path convention: videos/{athlete_id}/{uuid}.{ext}
-- ============================================================

-- Private bucket, 100MB cap, video types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 104857600,
        array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- Storage RLS: access is derived from the athlete-id folder in the path.
create policy "videos_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'videos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "videos_storage_select" on storage.objects for select
  using (
    bucket_id = 'videos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "videos_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'videos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------- videos (metadata) ----------
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id),
  storage_path text not null unique,
  title text not null check (length(trim(title)) > 0),
  shot_type text not null default 'other' check (shot_type in
    ('serve','forehand','backhand','volley','smash','return','movement','match_play','other')),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index videos_athlete_idx on public.videos (athlete_id, created_at desc);
alter table public.videos enable row level security;

create policy "videos_select" on public.videos for select
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));
create policy "videos_insert" on public.videos for insert
  with check ((athlete_id = auth.uid() or public.is_coach_of(athlete_id))
              and uploader_id = auth.uid());
create policy "videos_delete" on public.videos for delete
  using (athlete_id = auth.uid() or public.is_coach_of(athlete_id));

-- ---------- video_comments (timestamped) ----------
create table public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  timestamp_sec numeric not null check (timestamp_sec >= 0),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index video_comments_video_idx on public.video_comments (video_id, timestamp_sec);
alter table public.video_comments enable row level security;

-- Comment access mirrors video access.
create policy "vc_select" on public.video_comments for select
  using (exists (select 1 from public.videos v where v.id = video_id
                 and (v.athlete_id = auth.uid() or public.is_coach_of(v.athlete_id))));
create policy "vc_insert" on public.video_comments for insert
  with check (author_id = auth.uid()
    and exists (select 1 from public.videos v where v.id = video_id
                and (v.athlete_id = auth.uid() or public.is_coach_of(v.athlete_id))));
create policy "vc_delete_own" on public.video_comments for delete
  using (author_id = auth.uid());
