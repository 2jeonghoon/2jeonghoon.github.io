import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";

export function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../worker/migrations/0001_analytics.sql", import.meta.url), "utf8"));
  return {
    close: () => sqlite.close(),
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let values = [];
      const bound = {
        bind(...args) { values = args; return bound; },
        async run() { return statement.run(...values); },
        async all() { return {results: statement.all(...values)}; }
      };
      return bound;
    }
  };
}
