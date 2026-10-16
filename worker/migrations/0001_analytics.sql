CREATE TABLE IF NOT EXISTS daily_views (
  day TEXT NOT NULL,
  page TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (day, page)
);
