-- Reviewed-artifact record on CMS posts.
--
-- The bundled catalogue carries a `reviewedArtifact` (DOI, repository, or
-- dataset) that the reader renders as the article's artifact record and that the
-- research assistant matches against. CMS posts had no equivalent, so an article
-- written through /write could not keep its citation metadata once it was stored
-- in the CMS.
--
-- All columns are nullable: an article may review nothing but prose. When a type
-- is set the record must at least name what it points at.
--
-- Idempotent: safe to re-run.

begin;

alter table public.posts add column if not exists artifact_type text;
alter table public.posts add column if not exists artifact_title text;
alter table public.posts add column if not exists artifact_url text;
alter table public.posts add column if not exists artifact_identifier text;
alter table public.posts add column if not exists artifact_meta text;

alter table public.posts drop constraint if exists posts_artifact_type_allowed;
alter table public.posts add constraint posts_artifact_type_allowed
  check (artifact_type is null or artifact_type in ('paper', 'github', 'dataset'));

alter table public.posts drop constraint if exists posts_artifact_title_length;
alter table public.posts add constraint posts_artifact_title_length
  check (artifact_title is null or char_length(artifact_title) between 1 and 200);

alter table public.posts drop constraint if exists posts_artifact_identifier_length;
alter table public.posts add constraint posts_artifact_identifier_length
  check (artifact_identifier is null or char_length(artifact_identifier) between 1 and 160);

alter table public.posts drop constraint if exists posts_artifact_meta_length;
alter table public.posts add constraint posts_artifact_meta_length
  check (artifact_meta is null or char_length(artifact_meta) <= 160);

alter table public.posts drop constraint if exists posts_artifact_url_length;
alter table public.posts add constraint posts_artifact_url_length
  check (artifact_url is null or char_length(artifact_url) <= 2048);

-- A declared artifact must identify itself; a partial record is worse than none
-- because the reader would render an empty citation.
alter table public.posts drop constraint if exists posts_artifact_identified;
alter table public.posts add constraint posts_artifact_identified
  check (
    artifact_type is null
    or char_length(coalesce(artifact_identifier, '')) >= 1
    or char_length(coalesce(artifact_title, '')) >= 1
  );

comment on column public.posts.artifact_type is
  'paper | github | dataset. Null when the article reviews no external artifact.';

commit;
