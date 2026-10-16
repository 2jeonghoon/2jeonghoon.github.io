import {SecurityError} from "./security.mjs";

const DAY_MS = 86400000;

export function koreaDay(now) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function storage(db) {
  if (!db) throw new SecurityError("analytics storage unavailable", 503);
  return db;
}

export async function recordView(db, page, now) {
  await storage(db).prepare(
    "INSERT INTO daily_views (day, page, views) VALUES (?1, ?2, 1) " +
    "ON CONFLICT(day, page) DO UPDATE SET views = views + 1"
  ).bind(koreaDay(now), page).run();
}

export async function readAnalytics(db, now) {
  const days = Array.from({length: 30}, (_, index) => ({day: koreaDay(now - (29 - index) * DAY_MS), views: 0}));
  const database = storage(db);
  const [summary, daily, perPage] = await Promise.all([
    database.prepare("SELECT COALESCE(SUM(views), 0) AS total, COALESCE(SUM(CASE WHEN day = ?1 THEN views ELSE 0 END), 0) AS today FROM daily_views").bind(koreaDay(now)).all(),
    database.prepare("SELECT day, SUM(views) AS views FROM daily_views WHERE day >= ?1 AND day <= ?2 GROUP BY day").bind(days[0].day, days.at(-1).day).all(),
    database.prepare("SELECT page, SUM(views) AS views FROM daily_views GROUP BY page ORDER BY views DESC, page ASC").all()
  ]);
  const dates = new Map(days.map(row => [row.day, row]));
  for (const row of daily.results) if (dates.has(row.day)) dates.get(row.day).views = Number(row.views);
  return {total: Number(summary.results[0].total), today: Number(summary.results[0].today), days, pages: perPage.results.map(row => ({page: row.page, views: Number(row.views)}))};
}
