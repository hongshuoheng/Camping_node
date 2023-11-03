import "dotenv/config";
import express, { json } from "express";
import sales from "./data/sales.json" assert { type: "json" };
import multer from "multer"; //檔案上傳套件
// const upload = multer({ dest: "tmp_uploads" });
import upload from "./modules/upload-imgs.js";
import admin2Router from "./routes/admin2.js";
import addressBookRouter from "./routes/address-book.js";
import jwt from "jsonwebtoken";
import fs from "node:fs/promises";
import session from "express-session";
import mysql_session from "express-mysql-session";
import moment from "moment-timezone";
import dayjs from "dayjs";
import cors from "cors";
import db from "./modules/connect-mysql.js";
import bcrypt from "bcryptjs";

const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);
const app = express();

let data = [
  {
    id: "A001",
    name: "Steven",
    age: 29,
  },
  {
    id: "A002",
    name: "Andy",
    age: 30,
  },
  {
    id: "A003",
    name: "Tom",
    age: 27,
  },
];

app.set("view engine", "ejs"); //view engine是內建的

//***** 頂層middlewares *****
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    console.log({ origin });
    callback(null, true);
  },
};
app.use(cors(corsOptions));

app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "sjfkls*&(*sdkjfghkd78587",
    session: sessionStore,
    //cookie: {
    //maxAge: 1200_000,
    //},
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//***** 自訂middlewares *****
app.use((req, res, next) => {
  res.locals.title = "老杜的網站";
  res.locals.pageName = "";
  res.locals.session = req.session;

  let auth = req.get("Authorization");
  if (auth && auth.indexOf("Bearer ") === 0) {
    auth = auth.slice(7);
    try {
      res.locals.jwtData = jwt.verify(auth, process.env.JWT_SECRET);
    } catch (ex) {}
  }
  next();
});
//CRUD test
//list
app.get("/try-db", (req, res) => {
  let id = req.query.id;
  for (let i = 0; i < data.length; i++) {
    if (data[i].id == id) {
      res.json(data[i]);
      return;
    }
  }
});
//insert
app.post("/try-db/insert", (req, res) => {
  // res.send(req.body);
  console.log(req.body.id);
  data.push(req.body);
  res.send(data);
});

//update
app.post("/try-db/update", (req, res) => {
  let id = req.body.id;
  for (let i = 0; i < data.length; i++) {
    if (data[i].id == id) {
      data[i].name = req.body.name;
      data[i].age = req.body.age;
      break;
    }
  }
  res.json(data);
});

//delete
app.delete("/try-db/delete", (req, res) => {
  let id = req.body.id;
  for (let i = 0; i < data.length; i++) {
    if (data[i].id == id) {
      data.splice(i, 1);
      break;
    }
  }
  res.json(data);
});

//檔案上傳
app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json({
    file: req.file,
    body: req.body,
  });
});

//多個檔案上傳:(file要加's'), 使用upload.array
app.post("/try-uploads", upload.array("photos"), (req, res) => {
  res.json(req.files);
});

// parameters 路徑上的變數（動態路由）
app.get("/my-params1", (req, res) => {
  res.json(req.params);
});

app.get("/my-params2/:action?/:id?", (req, res) => {
  res.json(req.params);
});

// regular expression路由
app.get(/^\/09\d{2}\-?\d{3}\-?\d{3}$/, (req, res) => {
  let u = req.url.slice(1);
  u = u.split("?")[0];
  u = u.split("-").join("");
  res.send(u);
});

//使用expressRouter()模組化路由設定 import admin2.js
app.use(admin2Router);

//使用session套件建立session
app.get("/try-sess", (req, res) => {
  req.session.my_num = req.session.my_num || 0;
  req.session.my_num++;
  res.json(req.session);
});

//使用moment-timezone & day.js套件
app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment();
  const m2 = moment("2023-10-25");
  const m3 = moment("2018-08-08");
  const d1 = dayjs();                                            //使用day.js套件
  const d2 = dayjs().format("{YYYY} MM-DDTHH:mm:ss SSS [Z] A");  // display
  const d3 = dayjs("2018-08-08");                                // parse
  const d4 = dayjs().set("month", 3).month();

  res.json({
    m1a : m1.format(fm),
    m1b : m1.tz("Europe/London").format(fm),

    m2a : m2.format(fm),
    m2b : m2.tz("Europe/London").format(fm),
    m3  : m3.format(fm),
    d1  : d1.format(fm),
    d2  : d2,
    d3  : d3,
    d4  : d4,
  });
});

//表單post&get
app.get("/try-post-form", (req, res) => {
  res.locals.pageName = "try-post-form";
  res.render("try-post-form");
});
app.post("/try-post-form", (req, res) => {
  res.locals.pageName = "try-post-form";
  res.render("try-post-form", req.body);
});
//只接受GET方法來拜訪 路由一定要/開頭
app.get("/home", (req, res) => {
  // res.send(`<h2>Hooyah</h2>`);
  res.render("home", { name: "Steven" }); //home=filename
});

app.get("/test", (req, res) => {
  console.log(sales[0]);
  res.json(sales);
});

app.get("/test-table", (req, res) => {
  res.locals.pageName = "test-table";
  res.render("sales", { sales });
});

// app.get("/api", (req, res) => {
//   const obj = { name: "shin", age: 36 };
//   res.json(obj);
// });

//測試queryString
app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.post("/try-qs", (req, res) => {
  res.json(req.query);
});

const urlencodedParser = express.urlencoded({ extended: true });
app.post("/try-post", urlencodedParser, (req, res) => {
  res.json(req.body);
});

app.get("/try-pool", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM address_book LIMIT 5");
  res.json(rows);
});

app.use("/address-book", addressBookRouter);

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  let output = {
    success  : false,
    postData : req.body,
    code     : 0,
  };
  const sql = `SELECT * FROM members WHERE email =?`;

  const [rows] = await db.query(sql, [req.body.email]);
  if (!rows.length) {
    output.code = 400; //帳號是錯的
    return res.json(output);
  }
  const member = rows[0];

  const result = await bcrypt.compare(req.body.password, member.password);

  if (!result) {
    output.code = 420; //密碼是錯的
  } else {
    output.success = true;
    output.code = 200;
    //TODO: 記錄到session

    req.session.admin = {
      id       : member.id,
      email    : member.email,
      nickname : member.nickname,
    };
  }
  res.json(output);
});

//登出

app.get("/logout", (req, res) => {
  delete req.session.admin;
  res.redirect("/");
});

app.post("/login-jwt", async (req, res) => {
  let output = {
    success: false,
    postData: req.body,
    code: 0,
    data: {}, // 用戶端要存在 localStorage 裡
  };
  const sql = `SELECT * FROM members WHERE email=?`;
  const [rows] = await db.query(sql, [req.body.email]);
  if (!rows.length) {
    output.code = 400; // 帳號是錯的
    return res.json(output);
  }
  const member = rows[0];
  const result = await bcrypt.compare(req.body.password, member.password);
  if (!result) {
    output.code = 420; // 密碼是錯的
  } else {
    output.success = true;
    output.code = 200;
    // 打包 token
    const payload = {
      id: member.id,
      email: member.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    output.data = {
      id: member.id,
      email: member.email,
      nickname: member.nickname,
      token,
    };
  }
  res.json(output);
});

//******** 以上路由結束 ********

app.use(express.static("public")); //要渲染的靜態頁面要放在這行下面
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));
// 將 React app 和 Node.js 寫的 API 放在同一台伺服器
// https://qops.blogspot.com/2023/03/react-app-nodejs-api.html
app.use(express.static("build"));
let react_html = "";
fs.readFile("./build/index.html").then((txt) => {
  react_html = txt.toString();
});
// 剩下的所有路由, 都使用 react html
app.use((req, res) => {
  res.send(react_html);
});
//
app.use("/jquery", express.static("node_modules/jquery/dist"));

app.get("/try-address", (req, res) => {
  res.sendFile("try-address.html", { root: "public" });
});

app.use((req, res) => {
  res.type("text/html");
  res.status(404);
  res.send(`<h2>頁面不存在</h2>`);
});

const port = process.env.WEB_PORT || 3001;

app.listen(port, () => {
  console.log(`server started at port: ${port}`);
});
