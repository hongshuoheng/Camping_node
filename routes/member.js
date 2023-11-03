import express from "express";
import "dotenv/config";
import db from "./../modules/connect-mysql.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import multer from "multer";
import fs from "node:fs/promises";

const setTransport = () => {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: { user: "wwwblacksky@gmail.com", pass: "dSctA3xh9j4nrb8Z" },
  });
}; // send email
const sendMail = async (transporter, msg) => {
  await transporter.sendMail(msg, (err, info) => {
    if (err) {
      console.log("Error occurred. " + err.message);
      return process.exit(1);
    }
  });
};
const createCode = (long) => {
  let code = "";
  const random = new Array(
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z"
  );
  for (var i = 0; i < long; i++) {
    var index = Math.floor(Math.random() * 36); //取得隨機數的索引（0~35）
    code += random[index]; //根據索引取得隨機數加到code上
  }
  return code;
};
const router = express.Router();
//由此開始撰寫路由
router.get("/getCartCount", async (req, res) => {
  let output = {
    code: "",
    data: "",
    msg: "",
  };
  if (!req.jwtData) {
    output.msg = "會員驗證失敗";
  } else {
    let [row] = await db.query(
      "Select IFNULL(Count(cart.cart_id),0) as total FROM cart WHERE user_id=?",
      req.jwtData.user_id
    );
    if (row.length > 0) {
      output.code = 200;
      output.msg = "成功";
      console.log(row);
      output.data = row[0].total;
    }
    res.json(output);
  }
});

//取得修改密碼驗證碼
router.post("/forgotpsw", async (req, res) => {
  let output = {
    code: "200",
    msg: "已傳送驗證碼",
  };
  let code = createCode(5);
  console.log(code);
  const transporter = setTransport();
  let msg = {
    from: "露營生活<Camp_Live@campmail.com>",
    to: req.body.user_mail,
    subject: "露營生活-您的驗證碼請求",
    text: `您的驗證碼為 ${code} ,請在20分鐘內輸入您的驗證碼以重設密碼。`,
  };

  sendMail(transporter, msg);
  output.resetCode = code;
  const [row] = await db.query(
    "INSERT INTO `forgotpsw` (`user_mail`, `resetCode`) VALUES (?,?)",
    [req.body.user_mail, code]
  );
  res.json(output);
});
//以驗證碼修改密碼
router.post("/resetPswByResetCode", async (req, res) => {
  let output = {
    code: "200",
    msg: "修改密碼成功",
  };

  const [row] = await db.query("SELECT * FROM `forgotpsw` WHERE user_mail =?", [
    req.body.user_mail,
  ]);
  if (row.length <= 0) {
    output.code = 400;
    output.msg = "驗證碼錯誤";
  } else {
    if (row[0].resetCode == req.body.resetCode) {
      await db.query(
        "DELETE FROM forgotpsw WHERE user_mail =? AND resetCode = ?",
        [req.body.user_mail, req.body.resetCode]
      );
      let password = await bcrypt.hash(req.body.password, 8);
      await db.query(
        "UPDATE `members` SET `password` = ? WHERE `members`.`user_mail` = ?",
        [password, req.body.user_mail]
      );
    }
  }

  res.json(output);
});
//重設密碼
router.post("/resetPsw", async (req, res) => {
  let output = {
    code: "",
    msg: "",
  };
  const [row] = await db.query("SELECT * FROM `members` WHERE user_id =?", [
    req.jwtData.user_id,
  ]);
  const compare = await bcrypt.compare(req.body.old_password, row[0].password);
  if (compare) {
    let password = await bcrypt.hash(req.body.new_password, 8);
    const [reset] = await db.query(
      "UPDATE `members` SET `password` = ? WHERE `members`.`user_id` = ? ",
      [password, req.jwtData.user_id]
    );
    if (reset.affectedRows) {
      output.code = 200;
      output.msg = "修改密碼成功，請重新登入";
    } else {
      output.code = 200;
      output.msg = "資料表未改變";
    }
  } else {
    output.code = 400;
    output.msg = "原密碼錯誤";
  }

  res.json(output);
});
// console.log(await bcrypt.hash("12345", 8));
router.get("/test", (req, res) => {
  console.log(req.jwtData);
  res.json(req.query);
});
//******** 登入 ********
router.post("/login", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    msg: "",
  };

  try {
    const [row] = await db.query(
      `SELECT * FROM members WHERE user_mail='${req.body.user_mail}'`
    );
    console.log(row.length);
    if (!row.length) {
      output = {
        ...output,
        code: 400,
        status: "Fail",
        msg: "查無此帳號",
      };
    } else {
      const member = row[0];
      const pswCompare = await bcrypt.compare(
        req.body.password,
        member.password
      );
      if (!pswCompare) {
        output = {
          ...output,
          code: 400,
          status: "Fail",
          msg: "輸入密碼錯誤",
        };
      } else {
        const data = {
          user_id: member.user_id,
          user_name: member.user_name,
          user_img: member.user_img,
          token: jwt.sign(
            { user_id: member.user_id, user_mail: member.user_mail },
            process.env.JWT_SECRET
          ),
        };
        output = {
          code: 200,
          status: "Success",
          msg: "登入成功",
          data: data,
        };
      }
    }
    res.json(output);
  } catch (error) {
    output = {
      ...output,
      code: 400,
      status: "Fail",
      msg: "發生錯誤，請稍後再試",
    };
    console.log("錯誤訊息：" + error.message);
    res.json(output);
  }
});
//******** 註冊 ********

router.post("/register", async (req, res) => {
  const email_re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (req.body.user_mail) {
    let {
      user_name,
      password,
      first_name,
      last_name,
      gender,
      user_mail,
      user_phone,
      city,
      area,
      user_address,
      postal_code,
    } = req.body;

    if (!user_mail) {
      flag = false;
      output.error.mail = "電子郵件為空";
    } else if (!email_re.test(user_mail)) {
      flag = false;
      output.error.mail = "電子郵件格式有誤";
    }
    if (!password) {
      flag = false;
      output.error.psw = "密碼為空";
    }
    if (!user_phone) {
      flag = false;
      output.error.phone = "連絡電話為空";
    }
    if (!first_name) {
      flag = false;
      output.error.FName = "姓氏為空";
    }
    if (!last_name) {
      flag = false;
      output.error.LName = "名字為空";
    }
    if (!city) {
      flag = false;
      output.error.city = "縣市未選擇";
    }
    if (!area) {
      flag = false;
      output.error.area = "地區未選擇";
    }
    if (!user_address) {
      flag = false;
      output.error.address = "地址為空";
    }
    if (!user_name) {
      user_name = last_name;
    }
    if (flag) {
      try {
        password = await bcrypt.hash(password, 8);
        const sql =
          "INSERT INTO `members` ( `user_name`, `password`, `first_name`, `last_name`, `gender`, `user_mail`,  `user_phone`, `city`, `area`, `user_address`, `postal_code`) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const [row] = await db.query(sql, [
          user_name,
          password,
          first_name,
          last_name,
          gender,
          user_mail,
          user_phone,
          city,
          area,
          user_address,
          postal_code,
        ]);
        if (row.affectedRows) {
          output = {
            ...output,
            code: 200,
            status: "success",
            data: row.affectedRows,
            msg: "註冊成功",
          };
        } else {
          flag = false;
          output.error.sql = "資料庫沒有變動";
        }
      } catch (error) {
        flag = false;
        output.error.sql = "資料庫發生錯誤";
        console.log("錯誤訊息：" + error.message);
      }
    }
  } else {
    output.error.req = "request錯誤";
  }

  if (!flag) {
    output = {
      ...output,
      code: 400,
      status: "Fail",
      msg: "發生錯誤，請稍後再試",
    };
  }
  res.json(output);
});

//******** 取得用戶資料 ********
router.get("/", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    console.log(auth);
    try {
      const sql = "SELECT * FROM members WHERE user_id=?";
      const [row] = await db.query(sql, [auth.user_id]);
      output.data = row[0];
      output.msg = "驗證成功，取得用戶資料";
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.get("/getMemberImg", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    console.log(auth);
    try {
      const sql = "SELECT user_img FROM members WHERE user_id=?";
      const [row] = await db.query(sql, [auth.user_id]);
      output.data = row[0];
      output.msg = "驗證成功，取得用戶資料";
    } catch (error) {
      flag = false;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
//******** 更新用戶資料 ********
router.put("/update", async (req, res) => {
  const email_re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.error.jwt = "會員驗證失敗";
  } else {
    let {
      user_name,
      first_name,
      last_name,
      gender,
      user_mail,
      user_phone,
      city,
      area,
      user_address,
      postal_code,
    } = req.body;
    let auth = req.jwtData;
    if (!user_mail) {
      flag = false;
      output.error.mail = "電子郵件為空";
    } else if (!email_re.test(user_mail)) {
      flag = false;
      output.error.mail = "電子郵件格式有誤";
    }
    // if (!password) {
    //   flag = false;
    //   output.error.psw = "密碼為空";
    // }
    if (!user_phone) {
      flag = false;
      output.error.phone = "連絡電話為空";
    }
    if (!first_name) {
      flag = false;
      output.error.FName = "姓氏為空";
    }
    if (!last_name) {
      flag = false;
      output.error.LName = "名字為空";
    }
    if (!city) {
      flag = false;
      output.error.city = "縣市未選擇";
    }
    if (!area) {
      flag = false;
      output.error.area = "地區未選擇";
    }
    if (!user_address) {
      flag = false;
      output.error.address = "地址為空";
    }
    if (flag) {
      try {
        const sql =
          "UPDATE `members` SET `user_name` = ?,`first_name` = ?, `last_name` = ?, `gender` = ?, `user_mail` = ?, `user_phone` = ?, `city` = ?, `area` = ?, `user_address` = ?, `postal_code` = ?, `update_date` = NOW() WHERE `members`.`user_id` = ?";
        const [row] = await db.query(sql, [
          user_name,
          first_name,
          last_name,
          gender,
          user_mail,
          user_phone,
          city,
          area,
          user_address,
          postal_code,
          auth.user_id,
        ]);
        if (row.affectedRows) {
          output = {
            ...output,
            code: 200,
            status: "success",
            data: row.affectedRows,
            msg: "修改成功",
          };
        } else {
          flag = false;
          output.error.sql = "資料庫沒有變動";
        }
      } catch (error) {
        flag = false;
        output.error.sql = "資料庫發生錯誤";
        console.log("錯誤訊息：" + error.message);
      }
    }
  }
  if (!flag) {
    output = {
      ...output,
      code: 400,
      status: "Fail",
      msg: "發生錯誤，請稍後再試",
    };
  }
  res.json(output);
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/member");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      req.jwtData.user_id +
        "_" +
        Date.now() +
        "." +
        file.originalname.split(".")[1]
    );
  },
});

let upload = multer({
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      cb(new Error("Please upload an image"));
    }
    cb(null, true);
  },
  storage: storage,
});

router.put("/updateImg", upload.single("file"), async (req, res) => {
  let output = {
    code: "",
    error: {},
    msg: "",
  };
  let flag = true;
  console.log(req.file);
  if (!req.jwtData) {
    flag = false;
    output.error.jwt = "會員驗證失敗";
  } else {
    let user_id = req.jwtData.user_id;

    if (flag) {
      try {
        const [delname] = await db.query(
          "SELECT user_img FROM members WHERE user_id=?",
          [user_id]
        );
        if (delname.length > 0 && delname[0].user_img) {
          try {
            fs.unlink("public/member/" + delname[0].user_img);
          } catch (error) {
            console.log(error);
          }
        }
        const sql =
          "UPDATE `members` SET user_img=? WHERE `members`.`user_id` = ?";
        const [row] = await db.query(sql, [req.file.filename, user_id]);
        if (row.affectedRows) {
          output = {
            ...output,
            code: 200,
            msg: "圖片上傳成功",
          };
        } else {
          flag = false;
          output.error.sql = "資料庫沒有變動";
        }
      } catch (error) {
        flag = false;
        output.error.sql = "資料庫發生錯誤";
        console.log("錯誤訊息：" + error.message);
      }
    }
  }
  if (!flag) {
    output = {
      ...output,
      code: 400,
      status: "Fail",
      msg: "發生錯誤，請稍後再試",
    };
  }

  res.json(output);
});
//******** 用戶書籤功能 ********
//******** 產品書籤     ********
router.get("/bookmark_product", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "SELECT bookmark_product.id,product.* FROM bookmark_product join product ON bookmark_product.product_id = product.product_id WHERE bookmark_product.user_id=?";
      const [row] = await db.query(sql, [auth.user_id]);
      output.data = row;
      output.msg = "驗證成功，取得用戶資料";
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.post("/bookmark_product", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "INSERT INTO `bookmark_product` (`user_id`, `product_id`) VALUES (?, ?) ";
      const [row] = await db.query(sql, [auth.user_id, req.body.product_id]);
      if (row.affectedRows) {
        output.data = row.affectedRows;
        output.msg = "新增書籤成功";
      } else {
        output.msg = "沒有變動";
      }
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.delete("/bookmark_product", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "DELETE FROM `bookmark_product` WHERE `bookmark_product`.`user_id` = ? AND `bookmark_product`.`product_id`=? ";
      const [row] = await db.query(sql, [auth.user_id, req.body.product_id]);
      if (row.affectedRows) {
        output.data = row.affectedRows;
        output.msg = "刪除書籤成功";
      } else {
        output.msg = "資料沒有變動";
      }
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫變更資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
//******** 營地書籤     ********
router.get("/bookmark_camp", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "SELECT `campground`.*, min(campingareatype.price) AS minPrice FROM `bookmark_camp` join `campground` on `bookmark_camp`.`campGroundID`=`campground`.`campGroundID` JOIN campingareatype ON campground.campGroundID = campingareatype.campGroundID WHERE `bookmark_camp`.`user_id`=? GROUP BY campingareatype.campGroundID;";
      const [row] = await db.query(sql, [auth.user_id]);
      output.data = row;
      output.msg = "驗證成功，取得用戶資料";
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.post("/bookmark_camp", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "INSERT INTO `bookmark_camp` (`user_id`, `campGroundID`) VALUES (?, ?) ";
      const [row] = await db.query(sql, [auth.user_id, req.body.campGroundID]);
      if (row.affectedRows) {
        output.data = row.affectedRows;
        output.msg = "新增書籤成功";
      } else {
        output.msg = "沒有變動";
      }
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.delete("/bookmark_camp", async (req, res) => {
  console.log(req.body);
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      console.log(req.body);
      const sql =
        "DELETE FROM bookmark_camp WHERE `bookmark_camp`.`user_id` = ? AND `bookmark_camp`.`campGroundID`=?";
      const [row] = await db.query(sql, [auth.user_id, req.body.campGroundID]);
      if (row.affectedRows) {
        output.data = row.affectedRows;
        output.msg = "刪除書籤成功";
      } else {
        output.msg = "資料沒有變動";
      }
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫變更資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
//******** 活動書籤     ********
router.get("/bookmark_event", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "SELECT `events`.*, `eventsimg`.`img_file` FROM `bookmark_event` JOIN `events` ON `bookmark_event`.`events_id` = `events`.`events_id` JOIN `eventsimg` ON `events`.`events_id`= `eventsimg`.`events_id` WHERE `eventsimg`.`show_first` = 1 AND user_id= ? ";
      const [row] = await db.query(sql, [auth.user_id]);
      output.data = row;
      output.msg = "驗證成功，取得用戶資料";
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.post("/bookmark_event", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "INSERT INTO `bookmark_event` (`user_id`, `events_id`) VALUES (?, ?) ";
      const [row] = await db.query(sql, [auth.user_id, req.body.events_id]);
      if (row.affectedRows) {
        output.data = row.affectedRows;
        output.msg = "新增書籤成功";
      } else {
        output.msg = "沒有變動";
      }
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
router.delete("/bookmark_event", async (req, res) => {
  console.log(req.body);
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      console.log(req.body);
      const sql =
        "DELETE FROM bookmark_event WHERE `user_id` = ? AND `events_id`=?";
      const [row] = await db.query(sql, [auth.user_id, req.body.events_id]);
      if (row.affectedRows) {
        output.data = row.affectedRows;
        output.msg = "刪除書籤成功";
      } else {
        output.msg = "資料沒有變動";
      }
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫變更資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});
//******** 文章書籤     ********
router.get("/bookmark_article", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: null,
    error: {},
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const auth = req.jwtData;
    try {
      const sql =
        "SELECT bookmark_article.msg_id,msgs.title,msgs.content,msgs.img,msgs.createTime,members.user_name,members.user_img,msgcategory.categoryname FROM bookmark_article JOIN msgs ON msgs.id = bookmark_article.msg_id JOIN msgcategory ON msgs.msgcategory = msgcategory.uid JOIN members ON members.user_id = msgs.userID WHERE bookmark_article.user_id=?";
      const [row] = await db.query(sql, [auth.user_id]);
      output.data = row;
      output.msg = "驗證成功，取得用戶資料";
    } catch (error) {
      flag = false;
      output.error.sql = error;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  console.log(123);
  res.json(output);
});
router.get("/toggle_bookmark_article", async (req, res) => {
  let output = {
    code: "",
    status: "",
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else if (!req.query.msg_id) {
    flag = false;
    output.msg = "發生錯誤";
  } else {
    const msg_id = req.query.msg_id;
    const user_id = req.jwtData.user_id;
    try {
      const sql =
        "SELECT bookmark_article.msg_id FROM bookmark_article WHERE bookmark_article.user_id=? AND msg_id=?";
      const [row] = await db.query(sql, [user_id, msg_id]);
      if (row.length) {
        const [del] = await db.query(
          "DELETE FROM bookmark_article WHERE bookmark_article.user_id=? AND msg_id=?",
          [user_id, msg_id]
        );
        if (del.affectedRows) {
          output.msg = "刪除書籤成功";
        } else {
          flag = false;
          output.msg = "資料沒有變動";
        }
      } else {
        const [add] = await db.query(
          "INSERT INTO bookmark_article (`msg_id`, `user_id`) VALUES ( ?, ?)",
          [msg_id, user_id]
        );
        if (add.affectedRows) {
          output.msg = "新增書籤成功";
        } else {
          flag = false;
          output.msg = "資料沒有變動";
        }
      }
    } catch (error) {
      flag = false;
      output.msg = "無法從資料庫取得資料，請稍後再試";
    }
  }
  if (flag) {
    output = { ...output, code: 200, status: "Success" };
  } else {
    output = { ...output, code: 400, status: "Fail" };
  }
  res.json(output);
});

//******** 歷史  **********
//******** 產品歷史  **********
router.get("/history_product", async (req, res) => {
  let output = {
    code: "",
    msg: "",
    data: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const user_id = req.jwtData.user_id;
    const sql = `SELECT purchase.purchase_id,purchase.user_id,purchase.purchase_date,GROUP_CONCAT(product.product_name,"/",purchase_details.pcs_purchased,"/",product.unit_price,"/",CONCAT('(顏色:',color.spec_name,' || 尺寸:',size.spec_name,' || 材質:',material.spec_name,')') ) AS products,payment.payment_method FROM purchase_details JOIN purchase ON purchase_details.purchase_id =purchase.purchase_id JOIN payment ON payment.payment_id=purchase.payment_id JOIN inventory ON inventory.inventory_id = purchase_details.inventory_id JOIN spec AS color ON color_spec=color.spec_id JOIN spec AS size ON size_spec=size.spec_id JOIN spec AS material ON material_spec=material.spec_id JOIN product ON product.product_id = inventory.product_id where purchase.user_id = ? group by purchase_id ORDER BY purchase.purchase_date DESC`;
    try {
      const [row] = await db.query(sql, user_id);
      row.forEach((r) => {
        r.products = r.products.split(",").map((p) => {
          return {
            product_name: p.split("/")[0],
            product_pcs: p.split("/")[1],
            price: p.split("/")[1] * p.split("/")[2],
            type: p.split("/")[3],
          };
        });
      });
      output.data = row;
    } catch (error) {
      flag = false;
      output.msg = "資料庫發生錯誤，請稍後再試";
    }
  }
  if (!flag) {
    output.code = 400;
  } else {
    output.code = 200;
    output.msg = "取得資料成功";
  }

  res.json(output);
});

//******** 營地預定歷史  **********
router.get("/history_camp", async (req, res) => {
  let output = {
    code: "",
    msg: "",
    data: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const user_id = req.jwtData.user_id;
    const sql = `SELECT PaymentTime,orderID,CONCAT(Year,"/",Month,"/","/",Day) AS order_date,CampgroundName,campName,campPrice,tentsPeople,tentsPrice,GROUP_CONCAT(optionNameArr,":",optionNumArr,":",optionPriceArr) AS options FROM campcart where user_id = ? AND payment =1 GROUP BY orderID ORDER BY PaymentTime DESC`;

    // const sql = `SELECT orderID,CONCAT(Year,"/",Month,"/","/",Day) AS order_date,CampgroundName,campName,campPrice,tentsPeople,tentsPrice, GROUP_CONCAT('[',JSON_OBJECT( 'option', optionNameArr, 'num', optionNumArr, 'price',optionPriceArr ),']') AS list FROM campcart GROUP BY orderID;`;

    try {
      const [row] = await db.query(sql, user_id);
      row.forEach((v) => {
        v.options = v.options
          .split(",")
          .filter((o) => {
            if (o.split(":")[0] != "N") {
              return o;
            }
          })
          .map((o1) => {
            return {
              option_name: o1.split(":")[0],
              option_num: o1.split(":")[1],
              option_price: o1.split(":")[2],
            };
          });
      });
      output.data = row;
    } catch (error) {
      flag = false;
      console.log(error);
      output.msg = "資料庫發生錯誤，請稍後再試";
    }
  }
  if (!flag) {
    output.code = 400;
  } else {
    output.code = 200;
    output.msg = "取得資料成功";
  }

  res.json(output);
});

//******** 活動歷史  **********
router.get("/history_event", async (req, res) => {
  let output = {
    code: "",
    msg: "",
    data: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const user_id = req.jwtData.user_id;
    const sql = `SELECT events.title,events.events_id,events.registration_end_time,events.event_start,events.evets_time,events.simpleIntro,eventsimg.img_file FROM registration_form JOIN events ON registration_form.events_id=events.events_id JOIN eventsimg ON eventsimg.events_id=events.events_id where eventsimg.show_first=1 AND registration_form.user_id = ?`;
    try {
      const [row] = await db.query(sql, user_id);
      output.data = row;
    } catch (error) {
      flag = false;
      output.msg = "資料庫發生錯誤，請稍後再試";
    }
  }
  if (!flag) {
    output.code = 400;
  } else {
    output.code = 200;
    output.msg = "取得資料成功";
  }

  res.json(output);
});

//******** 文章歷史  **********
router.get("/history_article", async (req, res) => {
  let output = {
    code: "",
    msg: "",
    data: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else {
    const user_id = req.jwtData.user_id;
    const sql = `SELECT msgs.id as msg_id,msgs.title,msgs.content,msgs.img,msgs.createTime,members.user_name,members.user_img,msgcategory.categoryname,msgs.browse,Count(reply.id) AS replies FROM msgs JOIN msgcategory ON msgs.msgcategory = msgcategory.uid JOIN members ON members.user_id = msgs.userID LEFT JOIN reply ON reply.articleID = msgs.id WHERE msgs.userID =? GROUP BY msgs.id`;
    try {
      const [row] = await db.query(sql, user_id);
      output.data = row;
    } catch (error) {
      flag = false;
      output.msg = "資料庫發生錯誤，請稍後再試";
    }
  }
  if (!flag) {
    output.code = 400;
  } else {
    output.code = 200;
    output.msg = "取得資料成功";
  }

  res.json(output);
});
//********  刪除文章  **********
router.delete("/delPostArticle", async (req, res) => {
  let output = {
    code: "",
    status: "",
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else if (!req.query.msg_id) {
    flag = false;
    output.msg = "請求發生錯誤，請稍後再試。";
  } else {
    const user_id = req.jwtData.user_id;
    const msg_id = req.query.msg_id;
    try {
      const [row] = await db.query(
        "DELETE FROM msgs WHERE id = ? AND userID=?",
        [msg_id, user_id]
      );
      if (row.affectedRows) {
        output.msg = "刪除文章成功。";
      } else {
        flag = false;
        output.msg = "發生錯誤，請稍後再試。";
      }
    } catch (ex) {
      flag = false;
      output.msg = "資料庫發生錯誤，請稍後再試。";
    }
  }
  if (flag) {
    output.code = 200;
    output.status = "success";
  } else {
    output.code = 400;
    output.status = "fail";
  }
  res.json(output);
});

//********  取得文章回覆  **********
router.get("/getPostReply", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: "",
    msg: "",
  };
  let flag = true;
  if (!req.query.msg_id) {
    flag = false;
    output.msg = "發生錯誤，請稍後再試。";
  } else {
    const msg_id = req.query.msg_id;
    try {
      const [row] = await db.query(
        "SELECT reply.*,members.user_name,members.user_img FROM reply JOIN members ON reply.userID = members.user_id WHERE articleID = ?",
        [msg_id]
      );
      if (row.length) {
        output.data = row;
        output.msg = "取得文章回覆。";
      } else {
        flag = false;
        output.msg = "此文章尚未有回覆";
      }
    } catch (ex) {
      flag = false;
      output.msg = "資料庫發生錯誤，請稍後再試。";
    }
  }
  if (flag) {
    output.code = 200;
    output.status = "success";
  } else {
    output.code = 400;
    output.status = "fall";
  }
  res.json(output);
});
//********  刪除文章回覆  **********
router.delete("/delPostReply", async (req, res) => {
  let output = {
    code: "",
    status: "",
    data: "",
    msg: "",
  };
  let flag = true;
  if (!req.jwtData) {
    flag = false;
    output.msg = "用戶資料驗證失敗";
  } else if (!req.query.reply_id) {
    flag = false;
    output.msg = "發生錯誤，請稍後再試。";
  } else {
    const user_id = req.jwtData.user_id;
    const reply_id = req.query.reply_id;
    try {
      const [ids] = await db.query(
        "SELECT msgs.userID AS post_id,reply.userID AS reply_id FROM reply JOIN msgs ON reply.articleID = msgs.id"
      );
      console.log(reply_id);
      console.log(ids[0]);
      if (ids[0].post_id == user_id || ids[0].reply_id == user_id) {
        const [row] = await db.query("DELETE FROM reply WHERE reply.id = ?", [
          reply_id,
        ]);
        if (row.affectedRows) {
          output.data = row;
          output.msg = "刪除文章回覆。";
        } else {
          flag = false;
          output.msg = "刪除失敗。";
        }
      } else {
        flag = false;
        output.msg = "很抱歉你沒有權限執行此功能。";
      }
    } catch (ex) {
      flag = false;
      output.msg = "資料庫發生錯誤，請稍後再試。";
    }
  }
  if (flag) {
    output.code = 200;
    output.status = "success";
  } else {
    output.code = 400;
    output.status = "fall";
  }
  res.json(output);
});

export default router;
