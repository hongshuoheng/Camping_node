import jwt from "jsonwebtoken";

//解密decode
const SECRET = "FDGoifwjonskjdhwqe0id12DFsfjowe"; //原密碼

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJfaWQiOjE3LCJuYW1lIjoiam9obiIsImlhdCI6MTY5NTA5MDM0MX0.YzrNE963zXDOdlXX9AkPRvgGj9Yhye6YnFtvkadfHho"; //拿到的token

const payload = jwt.verify(token, SECRET);

console.log(payload); // { member_id: 17, name: 'john', iat: 1695090341 }
