import express from "express";
import db from "./../modules/connect-mysql.js";
import dayjs from "dayjs";
import multer from "multer";
import upload from "../modules/upload-imgs.js";

const email_re =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const router = express.Router();

const getListData = async (req) => {
  const perPage = 20; // 每頁最多有幾筆
  let output = {
    success: false, // 有沒有成功取得資料
    redirect: "", // 有沒有要轉向
    info: "",
    page: 1,
    perPage,
    totalRows: 0, // 總筆數
    totalPages: 0, // 總頁數
    rows: [], // 該頁資料
  };
  //search功能
  let search = req.query.search || "";
  let searchEsc = "";
  search = search.trim(); // 去掉頭尾空白字元
  let where = " WHERE 1 ";
  if (search) {
    searchEsc = db.escape(`%${search}%`); //相似模糊搜尋
    where += ` AND (name LIKE ${searchEsc} OR address LIKE ${searchEsc} )`;
  }
  //--------

  let page = parseInt(req.query.page) || 1;
  if (page < 1) {
    output.redirect = "?page=1";
    output.info = "page 值不能小於 1";
    return output;
  }
  const [[{ totalRows }]] = await db.query(
    `SELECT COUNT(1) totalRows FROM address_book ${where} `
  );

  let totalPages = 0;
  let rows = [];
  if (totalRows > 0) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = "?page=" + totalPages;
      output.info = "page 值不能大於總頁數";
      return output;
    }

    const sql = `SELECT * FROM address_book ${where} ORDER BY sid DESC LIMIT ${
      (page - 1) * perPage
    }, ${perPage} `;
    [rows] = await db.query(sql);
    for (let r of rows) {
      if (r.birthday) {
        r.birthday = dayjs(r.birthday).format("YYYY-MM-DD");
      }
    }
    output.success = true;
  }

  output = { ...output, perPage, page, totalRows, totalPages, rows };

  return output;
};

router.get("/", async (req, res) => {
  const output = await getListData(req);
  if (output.redirect) {
    return res.redirect(output.redirect);
  }
  res.locals.pageName = "ab-list";
  if (req.session.admin) {
    res.render("address-book/list", output);
  } else {
    res.render("address-book/list-no-admin", output);
  }
});

router.use((req, res, next) => {
  // if (!req.session || !req.session.admin) {
  //   return res.status(403).send(`<h1>您沒有權限</h1>`);
  // }
  next();
});

router.get("/api", async (req, res) => {
  const output = await getListData(req);
  res.json(output);
});
router.get("/api-jwt", async (req, res) => {
  const output = await getListData(req);
  if (res.locals.jwtData) {
    output.jwtData = res.locals.jwtData;
  }
  res.json(output);
});

// 刪除單筆資料
router.get("/del/:sid", async (req, res) => {
  const sid = parseInt(req.params.sid);
  const sql = `DELETE FROM address_book WHERE sid="${sid}"`;
  const [result] = await db.query(sql);

  //result 裡面的affectedRows: 影響的列數
  let comeFrom = req.get("Referer");
  if (comeFrom) {
    res.redirect(comeFrom);
  } else {
    res.redirect("/address-book");
  }
});
//取得單筆資料
router.get("/api/:sid", async (req, res) => {
  const sid = parseInt(req.params.sid);
  const sql = `SELECT * FROM address_book WHERE sid="${sid}"`;
  const [result] = await db.query(sql);

  let item = {};
  if (result.length) {
    let item = result[0];
  }
  //result 裡面的affectedRows: 影響的列數
  res.json(result);
});

//新增頁面
router.get("/add", async (req, res) => {
  res.locals.pageName = "ab-add"; //在navbar.ejs的<li>
  res.render("address-book/add");
});

// 編輯資料的表單
router.get("/edit/:sid", async (req, res) => {
  const sid = parseInt(req.params.sid) || 0;
  const sql = `SELECT * FROM address_book WHERE sid=${sid} `;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.redirect("/address-book");
  }
  let item = { ...rows[0] };
  const b = dayjs(item.birthday);
  if (b.isValid()) {
    item.birthday = b.format("YYYY-MM-DD");
  } else {
    item.birthday = "";
  }
  res.render("address-book/edit", item);
});

router.post("/api", async (req, res) => {
  const output = {
    success: false,
    // error: "",
    errors: {},
    result: {},
    postData: req.body, //除錯檢查用
  };
  //TODO: 欄位格式檢查
  let isPass = true; //有沒有通常檢查

  if (req.body.name) {
    let { name, email, mobile, birthday, address } = req.body;

    //檢查姓名欄位
    if (name.length < 2) {
      output.errors.name = "姓名字串長度請大於2個字元";
      isPass = false;
    }

    //檢查email欄位
    if (!email_re.test(email)) {
      output.errors.email = "Email格式不正確";
      isPass = false;
    }
    birthday = dayjs(birthday);
    if (!birthday.isValid()) {
      birthday = null;
    } else {
      birthday = birthday.format("YYYY-MM-DD");
    }

    let result; //變數未賦值前為undefined
    if (isPass) {
      try {
        const sql = `INSERT INTO address_book
      (name, email, mobile, birthday, address, created_at)
      VALUES 
      (?, ?, ?, ?, ?, NOW())`;

        [result] = await db.query(sql, [
          name,
          email,
          mobile,
          birthday,
          address,
        ]);
        output.success = !!result.affectedRows;
        output.result = result;
      } catch (ex) {
        output.error = "SQL 錯誤";
        output.ex = ex;
      }
    }
  }
  res.json(output);
});

//刪除單筆資料
router.delete("/api/:sid", async (req, res) => {
  const sid = parseInt(req.params.sid);
  const sql = `DELETE FROM address_book WHERE sid="${sid}"`;
  const [result] = await db.query(sql);

  //result 裡面的affectedRows: 影響的列數
  res.json({
    success: !!result.affectedRows,
    sid,
  });
});

// 編輯資料的功能
router.put("/api/:sid", async (req, res) => {
  const output = {
    success: false,
    error: null,
    errors: {},
    result: {},
    postData: req.body, // 除錯檢查用
  };
  // TODO: 欄位格式檢查
  let isPass = true; // 有沒有通常檢查
  if (req.body.name) {
    let { sid, name, email, mobile, birthday, address } = req.body;
    // 檢查姓名欄位
    if (name.length < 2) {
      output.errors.name = "姓名字串長度請大於 2 個字元";
      isPass = false;
      output.error = true;
    }
    // 檢查 email
    if (!email_re.test(email)) {
      output.errors.email = "Email 格式不正確";
      isPass = false;
      output.error = true;
    }
    birthday = dayjs(birthday);
    if (!birthday.isValid()) {
      birthday = null;
    } else {
      birthday = birthday.format("YYYY-MM-DD");
    }
    let result;
    if (isPass) {
      try {
        const sql =
          "UPDATE `address_book` SET `name`=?,`email`=?,`mobile`=?,`birthday`=?,`address`=? WHERE `sid`=? ";
        [result] = await db.query(sql, [
          name,
          email,
          mobile,
          birthday,
          address,
          sid,
        ]);
        output.success = !!result.changedRows;
        output.result = result;
      } catch (ex) {
        output.error = "SQL 錯誤";
        output.ex = ex;
      }
    }
  }
  res.json(output);
});

export default router;
