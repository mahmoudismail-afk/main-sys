const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:HEMVBvnB5vWlCufc@db.mmumcejifxfszjzjzjjl.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Connecting to Supabase...");
    await client.connect();
    console.log("Connected. Reading schema.sql...");
    const sql = fs.readFileSync('C:\\WEB\\ms\\startup_os\\schema.sql', 'utf8');
    console.log("Executing schema.sql...");
    await client.query(sql);
    console.log("Schema executed successfully.");
  } catch (err) {
    console.error("Error executing schema:", err);
  } finally {
    await client.end();
  }
}
run();
