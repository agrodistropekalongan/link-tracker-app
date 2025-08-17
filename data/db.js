import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const adapter = new JSONFile('db.json');

// ✅ Pass default data as second argument
const db = new Low(adapter, { links: [] });

await db.read();

// Optional: defensive fallback if file is empty
db.data ||= { links: [] };

await db.write();

export default db;