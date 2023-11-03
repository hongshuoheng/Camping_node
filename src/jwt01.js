import jwt from "jsonwebtoken"; //import套件

//加密 encode
const SECRET = "FDGoifwjonskjdhwqe0id12DFsfjowe"; //定義要加密字串

const token = jwt.sign({ member_id: 17, name: "john" }, SECRET); //建立一個token

console.log({ token });

// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJfaWQiOjE3LCJuYW1lIjoiam9obiIsImlhdCI6MTY5NTA5MDM0MX0.YzrNE963zXDOdlXX9AkPRvgGj9Yhye6YnFtvkadfHho'
//拿到的token
