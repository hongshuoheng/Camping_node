import db from "mysql2/promise";

import "dotenv/config";

const connection = await db.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const [rows, fields] = await connection.query("SELECT * FROM categories");

console.log(rows);
console.log(fields);
process.exit();
