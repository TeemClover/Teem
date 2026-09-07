import { DatabaseSync } from 'node:sqlite';

/** Executes the production SQL in real SQLite. Only the D1 transport shape is adapted. */
export function sqliteD1(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  const db = {
    sqlite,
    prepare(sql) {
      const query = sqlite.prepare(sql);
      let values = [];
      const statement = {
        bind(...parameters) { values = parameters; return statement; },
        async run() {
          const result = query.run(...values);
          return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
        },
        async all() { return { success: true, results: query.all(...values).map(row => ({ ...row })) }; },
        async first(column) {
          const row = query.get(...values);
          return row ? (column ? row[column] : { ...row }) : null;
        },
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT'); return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    async exec(sql) { sqlite.exec(sql); return { count: 1, duration: 0 }; },
    close() { sqlite.close(); },
  };
  return db;
}
