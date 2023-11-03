import bcrypt from "bcryptjs";

const hash = "$2a$10$xql/FxXYA74vWBVbNy1KgOe/IkX4wHdKppvjSJvVxP5kc3IAeAiV.";

const result = await bcrypt.compare("1234567", hash);

console.log({ result });
