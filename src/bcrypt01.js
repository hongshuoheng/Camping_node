import bcrypt from "bcryptjs";

const pass = "1234567";

const hash = await bcrypt.hash(pass, 10);

console.log({ hash });
