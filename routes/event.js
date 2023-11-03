import express from "express";
import db from "./../modules/connect-mysql.js";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
const router = express.Router();
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

//由此開始撰寫路由
//!=========================================信件開始*******
router.get("/test", async () => {
  let output = {
    code: "200",
    msg: "已傳送驗證碼",
  };
  let code = createCode(5);
  console.log(code);
  const sql = `SELECT *
FROM events
JOIN registration_form ON events.events_id = registration_form.events_id WHERE 1`;
  const [data] = await db.query(sql);
  // 判斷活動是否在開始前3天，並發送提醒郵件
  for (const events of data) {
    const startDate = new Date(events.event_start);
    const currentDate = new Date();

    // 設定提前3天的時間
    const threeDaysBefore = new Date(startDate);
    threeDaysBefore.setDate(startDate.getDate() - 5);

    // 如果當前時間在提前3天之內，發送提醒郵件
    if (currentDate < startDate && currentDate >= threeDaysBefore) {
      const to = "wait455231@gmail.com"; // 替換成使用者的郵件地址
      const subject = "活動即將開始提醒";
      const text =
        "親愛的使用者，您參與的活動即將在3天後開始。請準備好參與活動。";

      await sendMail(to, subject, text);
    }
  }

  const transporter = setTransport();
  let msg = {
    from: "露營生活<Camp_Live@campmail.com>",
    to: "wait455231@gmail.com",
    subject: "活動即將開始提醒",
    text: `親愛的使用者，您參與的活動將在3天後開始。請準備好參與活動。`,
  };

  sendMail(transporter, msg);
  output.resetCode = code;
  // const [row] = await db.query(
  //   "INSERT INTO `forgotpsw` (`user_mail`, `resetCode`) VALUES (?,?)",
  //   [req.body.user_mail, code]
  // );
  res.json(output);
});
//!=======================*****************信件結束********
//!活動首頁開始******************************************************************
router.get("/front", async (req, res) => {
  // ***這邊的/己經是/front/ --> 開始***
  //加入sql語法
  const sql = `SELECT * FROM events JOIN eventsimg ON events.events_id= eventsimg.events_id JOIN store on events.store_id = store.store_id WHERE show_first = 1 ORDER BY RAND() LIMIT 4`;

  const [data] = await db.query(sql);
  res.json(data); //回傳json格式
});
router.post("/front", async (req, res) => {
  const { id } = req.body;
  const sql = `UPDATE events SET click = click + 1 WHERE events_id = ${id};`;
  const [updateResult] = await db.query(sql);
  if (updateResult.affectedRows) {
    const info = {
      recommended: [],
      north: [],
      south: [],
      west: [],
      east: [],
      all: [],
    };
    //#篩選全部===================================================
    const sqlAll = `SELECT * FROM events JOIN eventsimg ON events.events_id= eventsimg.events_id WHERE show_first = 1  `;
    const [dataAll] = await db.query(sqlAll);
    info.all = dataAll;
    res.json(info);
  } else {
    res.json({
      error: "失敗",
    });
  }
});
//!活動首頁結束 *****************S************************************s

//!分類頁面開始******************************************************************
router.post("/category", async (req, res) => {
  const LoactionEnum = {
    north: 1,
    central: 2,
    south: 3,
    west: 4,
  };
  const { page, itemsPerPage } = req.query; // 從前端取得分頁相關的資訊
  const info = {
    sqlHeart: [],
    sqlAll: [],
    totalPages: 0, // 新增總頁數屬性
    currentPage: parseInt(page) || 1, // 新增當前頁碼屬性
  };

  const uid = req.jwtData.user_id;
  const type = req.body.type;
  const sqlHeart = `SELECT * FROM bookmark_event JOIN members ON bookmark_event.user_id = members.user_id WHERE bookmark_event.user_id = ${uid};`;
  const [dataHeart] = await db.query(sqlHeart);
  info.sqlHeart = dataHeart;

  const offset = (info.currentPage - 1) * itemsPerPage;

  const sqlAll = `SELECT 
    events.*,
    eventsimg.*,
    events.applicantlimitedqty - COALESCE(SUM(registration_form.number_of_applicants), 0) AS remaining_slots,
    store.*
FROM 
    events
JOIN 
    eventsimg ON events.events_id = eventsimg.events_id
LEFT JOIN 
    registration_form ON events.events_id = registration_form.events_id
LEFT JOIN
    store ON events.store_id = store.store_id
WHERE 
    eventsimg.show_first = 1
GROUP BY 
    events.events_id
LIMIT ${itemsPerPage}
OFFSET ${offset};`;

  const sqlHot = `SELECT 
    events.*,
    eventsimg.*,
    events.applicantlimitedqty - COALESCE(SUM(registration_form.number_of_applicants), 0) AS remaining_slots,
    store.*
FROM 
    events
JOIN 
    eventsimg ON events.events_id = eventsimg.events_id
LEFT JOIN 
    registration_form ON events.events_id = registration_form.events_id
LEFT JOIN
    store ON events.store_id = store.store_id
WHERE 
    eventsimg.show_first = 1
GROUP BY 
    events.events_id
ORDER BY
    events.click DESC
LIMIT ${itemsPerPage}
OFFSET ${offset};`;
  const sqllocation = `SELECT 
    events.*,
    eventsimg.*,
    events.applicantlimitedqty - COALESCE(SUM(registration_form.number_of_applicants), 0) AS remaining_slots,
    store.*
FROM 
    events
JOIN 
    eventsimg ON events.events_id = eventsimg.events_id
LEFT JOIN 
    registration_form ON events.events_id = registration_form.events_id
LEFT JOIN
    store ON events.store_id = store.store_id
WHERE 
    eventsimg.show_first = 1
    AND store.store_id= ${LoactionEnum[type]}
GROUP BY 
    events.events_id
LIMIT ${itemsPerPage}
OFFSET ${offset};`;

  if (LoactionEnum[type]) {
    const [loaction] = await db.query(sqllocation);
    info.sqlAll = loaction;
  }

  if (type == "hot") {
    const [hot] = await db.query(sqlHot);
    info.sqlAll = hot;
  }
  if (type == "all") {
    const [data] = await db.query(sqlAll);

    info.sqlAll = data;
  }

  // 計算總頁數
  const totalEventsSql = `SELECT COUNT(DISTINCT events.events_id) as total FROM events JOIN eventsimg ON events.events_id = eventsimg.events_id JOIN store ON events.store_id = store.store_id WHERE eventsimg.show_first = 1 `;

  const isLocations = `AND store.store_id= ${LoactionEnum[type]}`;

  const mixedSql = LoactionEnum[type]
    ? totalEventsSql + isLocations
    : totalEventsSql;

  const [totalEvents] = await db.query(mixedSql);
  const totalPages = Math.ceil(totalEvents[0].total / itemsPerPage);
  info.totalPages = totalPages;

  res.json(info);
});

router.post("/categoryd", async (req, res) => {
  const { id } = req.body;
  console.log(req.body);
  const sql = `UPDATE events SET click = click + 1 WHERE events_id = ${id};`;
  const [updateResult] = await db.query(sql);
  if (updateResult.affectedRows) {
    const info = {
      recommended: [],
      north: [],
      south: [],
      west: [],
      east: [],
      all: [],
    };
    //#篩選全部===================================================
    const sqlAll = `SELECT * FROM events JOIN eventsimg ON events.events_id= eventsimg.events_id WHERE show_first = 1  `;
    const [dataAll] = await db.query(sqlAll);
    info.all = dataAll;
    res.json(info);
  } else {
    res.json({
      error: "失敗",
    });
  }
});
//!分類頁面結束******************************************************************

//!活動列表開始**********************************************************
router.post("/", async (req, res) => {
  // *** 這邊的 / 己經是/events/ --> 開始 ***
  const info = {
    sqlHeart: [],
    sqlAll: [],
  };
  const uid = req.body.user_id;
  const sqlHeart = `SELECT * FROM bookmark_event JOIN members ON bookmark_event.user_id = members.user_id WHERE bookmark_event.user_id = ${uid};`;
  const [dataHeart] = await db.query(sqlHeart);
  info.sqlHeart = dataHeart;
  const sqlAll = `SELECT 
    events.*,
    eventsimg.*,
    events.applicantlimitedqty - COALESCE(SUM(registration_form.number_of_applicants), 0) AS remaining_slots,
    store.*
FROM 
    events
JOIN 
    eventsimg ON events.events_id = eventsimg.events_id
LEFT JOIN 
    registration_form ON events.events_id = registration_form.events_id
LEFT JOIN
    store ON events.store_id = store.store_id
WHERE 
    eventsimg.show_first = 1
GROUP BY 
    events.events_id; `;

  const [data] = await db.query(sqlAll);
  info.sqlAll = data;
  res.json(info);
  console.log(data);
});
router.post("/s", async (req, res) => {
  const { id } = req.body;
  const sql = `UPDATE events SET click = click + 1 WHERE events_id = ${id};`;
  const [updateResult] = await db.query(sql);
  if (updateResult.affectedRows) {
    const info = {
      recommended: [],
      north: [],
      south: [],
      west: [],
      east: [],
      all: [],
    };
    //#篩選全部===================================================
    const sqlAll = `SELECT * FROM events JOIN eventsimg ON events.events_id= eventsimg.events_id WHERE show_first = 1  `;
    const [dataAll] = await db.query(sqlAll);
    info.all = dataAll;
    res.json(info);
  } else {
    res.json({
      error: "失敗",
    });
  }
});
//!活動列表結束***********************************************

//!報名頁面開始******************************************************************

router.post("/registration_form", async (req, res) => {
  let {
    events_id,
    user_id,
    email,
    number_of_applicants,
    emergency_contact,
    phone,
  } = req.body;

  const addsql =
    "INSERT INTO `registration_form`(`events_id`, `user_id`, `email`, `number_of_applicants`, `emergency_contact`, `phone`) VALUES (?, ?, ?, ?, ?, ?)";
  const [addResult] = await db.query(addsql, [
    events_id,
    user_id,
    email,
    number_of_applicants,
    emergency_contact,
    phone,
  ]);

  console.log("addResult", addResult);

  if (addResult.affectedRows) {
    res.json({
      success: "success",
    });
  } else {
    res.json({
      error: "失敗",
    });
  }
});
//!報名頁面結束******************************************************************

//!詳細頁面開始****************************************************
router.get("/:eid", async (req, res) => {
  //剩餘人數
  const info = { peoplesql: [], sql: [] };
  const peoplesql = `SELECT 
    events.events_id,
    events.title,
    events.applicantlimitedqty - SUM(registration_form.number_of_applicants) AS remaining_slots
FROM 
    events
LEFT JOIN 
    registration_form ON events.events_id = registration_form.events_id
GROUP BY 
    events.events_id=${req.params.eid}`;
  //  ${req.params.eid}
  const [people] = await db.query(peoplesql);
  info.peoplesql = people;
  // ***這邊的/己經是/:eid/ --> 開始***
  //加入sql語法
  const sql = `SELECT * 
FROM events 
JOIN eventsimg ON events.events_id = eventsimg.events_id 
JOIN store ON events.store_id = store.store_id 
WHERE events.events_id = ${req.params.eid}`;
  const [data] = await db.query(sql);
  info.sql = data;
  res.json(info); //回傳json格式
  //非同步async/await 將sql抓到檔案存入陣列
  // const [data] = await db.query(sql);
});
//!詳細頁面結束******************************************************************
export default router;
