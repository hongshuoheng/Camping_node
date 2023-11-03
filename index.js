import "dotenv/config";
import express, { json } from "express";
import multer from "multer"; //檔案上傳套件
// const upload = multer({ dest: "tmp_uploads" });
import upload from "./modules/upload-imgs.js";
import addressBookRouter from "./routes/address-book.js";
import path from "node:path";
//專案功能router
import productRouter from "./routes/product.js";
import eventRouter from "./routes/event.js";
import discussionRouter from "./routes/discussion.js";
import memberRouter from "./routes/member.js";
import campSiteRouter from "./routes/campSite.js";

import jwt from "jsonwebtoken"; // web token 登入用localStorage
import fs from "node:fs/promises";
import session from "express-session";
import mysql_session from "express-mysql-session";
import cors from "cors"; //跨伺服器套件
import db from "./modules/connect-mysql.js";
import bcrypt from "bcryptjs"; //密碼加密套件

const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);
const app = express();

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
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

//***** 自訂middlewares *****
app.use((req, res, next) => {
  let auth = req.get("Authorization");
  console.log(auth);
  if (auth && auth.indexOf("Bearer ") === 0) {
    console.log("req的Headers裡有token");
    auth = auth.slice(7);
    try {
      req.jwtData = jwt.verify(auth, process.env.JWT_SECRET);
    } catch (ex) {}
  } else {
    console.log("req的Headers裡沒有token");
  }
  next();
});

//******** 以上路由結束 ********
app.use("/product", productRouter);
app.use("/discussion", discussionRouter);
app.use("/member", memberRouter);
app.use("/event", eventRouter);
app.use("/campsite", campSiteRouter);

//******** 以上路由結束 ********

app.use((req, res) => {
  res.type("text/html");
  res.status(404);
  res.send(`<h2>頁面不存在</h2>`);
});

const port = process.env.WEB_PORT || 3001;

app.listen(port, () => {
  console.log(`server started at port: ${port}`);
});
