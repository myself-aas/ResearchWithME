# ResearchWithMe Database Schema Context

## Supabase Tables

### Core Tables

#### `profiles` (extends auth.users)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  orcid_id TEXT UNIQUE,
  github_url TEXT,
  twitter_url TEXT,
  website_url TEXT,
  affiliation TEXT,
  role TEXT DEFAULT 'author' CHECK (role IN ('author', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### `categories`
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
```

#### `articles`
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  reading_time INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published ON articles(published_at DESC);

-- RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are viewable by everyone"
  ON articles FOR SELECT USING (status = 'published');

CREATE POLICY "Authors can manage own articles"
  ON articles FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Editors can manage all articles"
  ON articles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin'))
  );
```

#### `papers`
```sql
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors JSONB NOT NULL, -- [{name, orcid_id, affiliation}]
  doi TEXT UNIQUE,
  arxiv_id TEXT UNIQUE,
  published_at TIMESTAMPTZ NOT NULL,
  journal TEXT,
  volume TEXT,
  issue TEXT,
  pages TEXT,
  pdf_url TEXT,
  code_url TEXT,
  tags TEXT[] DEFAULT '{}',
  citation_count INTEGER DEFAULT 0,
  reference_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_papers_doi ON papers(doi);
CREATE INDEX idx_papers_arxiv ON papers(arxiv_id);
CREATE INDEX idx_papers_published ON papers(published_at DESC);
CREATE INDEX idx_papers_tags ON papers USING GIN(tags);

-- RLS
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Papers are viewable by everyone" ON papers FOR SELECT USING (true);
```

#### `paper_citations` (citation graph)
```sql
CREATE TABLE paper_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citing_paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  cited_paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  citation_context TEXT, -- Surrounding text of citation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(citing_paper_id, cited_paper_id)
);

-- Indexes
CREATE INDEX idx_citations_citing ON paper_citations(citing_paper_id);
CREATE INDEX idx_citations_cited ON paper_citations(cited_paper_id);

-- RLS
ALTER TABLE paper_citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Citations are viewable by everyone" ON paper_citations FOR SELECT USING (true);
```

#### `comments`
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  article_slug TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comments_article ON comments(article_slug);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Authors can manage own comments"
  ON comments FOR ALL USING (auth.uid() = author_id);
```

#### `bookmarks`
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_slug TEXT REFERENCES articles(slug) ON DELETE CASCADE,
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_slug),
  UNIQUE(user_id, paper_id),
  CHECK (article_slug IS NOT NULL OR paper_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_article ON bookmarks(article_slug);
CREATE INDEX idx_bookmarks_paper ON bookmarks(paper_id);

-- RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
  ON bookmarks FOR ALL USING (auth.uid() = user_id);
```

#### `article_likes`
```sql
CREATE TABLE article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_slug)
);

-- RLS
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" ON article_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Likes are viewable by everyone" ON article_likes FOR SELECT USING (true);
```

### Analytics Tables

#### `article_views`
```sql
CREATE TABLE article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_views_article ON article_views(article_slug);
CREATE INDEX idx_views_created ON article_views(created_at DESC);

-- RLS
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can view own article analytics"
  ON article_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM articles WHERE slug = article_views.article_slug AND author_id = auth.uid())
  );
CREATE POLICY "Editors can view all analytics"
  ON article_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin'))
  );
```

#### `search_queries`
```sql
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors can view search analytics"
  ON search_queries FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin'))
  );
```

## Functions & Triggers

### `update_updated_at_column()`
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... repeat for all tables
```

### `increment_article_views()`
```sql
CREATE OR REPLACE FUNCTION increment_article_views(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE articles SET view_count = view_count + 1 WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `update_article_like_count()`
```sql
CREATE OR REPLACE FUNCTION update_article_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE articles SET like_count = like_count + 1 WHERE slug = NEW.article_slug;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE articles SET like_count = like_count - 1 WHERE slug = OLD.article_slug;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON article_likes
  FOR EACH ROW EXECUTE FUNCTION update_article_like_count();
```

### `update_paper_citation_counts()`
```sql
CREATE OR REPLACE FUNCTION update_paper_citation_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE papers SET citation_count = citation_count + 1 WHERE id = NEW.cited_paper_id;
    UPDATE papers SET reference_count = reference_count + 1 WHERE id = NEW.citing_paper_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE papers SET citation_count = citation_count - 1 WHERE id = OLD.cited_paper_id;
    UPDATE papers SET reference_count = reference_count - 1 WHERE id = OLD.citing_paper_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_citation_counts
  AFTER INSERT OR DELETE ON paper_citations
  FOR EACH ROW EXECUTE FUNCTION update_paper_citation_counts();
```

## Row Level Security Patterns

### Public Read, Auth Write
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON table_name FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON table_name FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own" ON table_name FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own" ON table_name FOR DELETE USING (auth.uid() = user_id);
```

### Role-Based Access
```sql
CREATE POLICY "Editors full access" ON table_name FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin'))
);
```

### Owner-Only Access
```sql
CREATE POLICY "Owner full access" ON table_name FOR ALL USING (auth.uid() = owner_id);
```

## Migrations

### Location
`supabase/migrations/` - Idempotent SQL files

### Naming
`YYYYMMDDHHMMSS_description.sql`

### Example
```sql
-- 20240115000000_add_reading_time_to_articles.sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reading_time INTEGER DEFAULT 0;

-- Backfill
UPDATE articles SET reading_time = CEIL(LENGTH(content) / 1000) WHERE reading_time = 0;
```

## Local Development

### Start Supabase
```bash
supabase start
```

### Reset Database
```bash
supabase db reset
```

### Generate Types
```bash
supabase gen types typescript --local > lib/supabase/types.ts
```

### Create Migration
```bash
supabase migration new migration_name
```

### Apply Migrations
```bash
supabase db push
```