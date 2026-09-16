// Neon sends this ordered transaction in one HTTP request. Keep schema statements
// together without awaiting individual query promises (which would send them).
export async function runSchemaBatch(sql, statements) {
  if (typeof sql.transaction === 'function') {
    return sql.transaction(tx => statements.map(statement => tx.query(statement)), { isolationLevel: 'ReadCommitted' });
  }
  // Query-only adapters retain the same order. A failed transaction must reject,
  // never fall back to replaying its statements outside the transaction.
  const results = [];
  for (const statement of statements) results.push(await sql.query(statement));
  return results;
}
