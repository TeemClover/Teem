// Receipt creation and offer issuance share this account lock. The second
// statement gets a fresh READ COMMITTED snapshot after any lock wait, so it sees
// a concurrently committed pending receipt before issuing a recovery price.
export async function learnAccountWrite(sql,userId,text,params) {
  const results=await sql.transaction(tx=>[
    tx.query('SELECT id FROM mc_accounts WHERE id=$1 FOR UPDATE',[userId]),
    tx.query(text,params),
  ],{isolationLevel:'ReadCommitted'});
  return results[1];
}
