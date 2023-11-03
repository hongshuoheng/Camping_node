import "dotenv/config";

const { DB_USER, DB_PASS } = process.env;

console.log({ DB_USER, DB_PASS });
