import express, { Router } from 'express'
import db from './../modules/connect-mysql.js'
import { v4 as uuidv4 } from 'uuid'
uuidv4() // -> '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
import 'dotenv/config'
import LinePayNode from 'line-pay-merchant'
import util from 'util'
import pkg from 'crypto-js'
const { HmacSHA256 } = pkg
import Base64 from 'crypto-js/enc-base64.js'
import axios from 'axios'

const router = express.Router()
//由此開始撰寫路由
//* LINE PAY 環境變數
const {
  LINEPAY_CHANNEL_ID,
  LINEPAY_VERSION,
  LINEPAY_SITE,
  LINEPAY_CHANNEL_SECRET_KEY,
  LINEPAY_RETURN_HOST,
  LINEPAY_RETURN_CONFIRM_URL,
  LINEPAY_RETURN_CANCEL_URL
} = process.env

//* 營地list SQL
router.get('/', async (req, res) => {
  // *** 這邊的 / 己經是/campSite/ --> 開始 ***
  //加入sql語法
  //* 總表語法
  // SELECT * FROM campground JOIN campingareatype ON campground.campGroundID = campingareatype.campGroundID;
  //* 最低價錢語法
  // SELECT campground.*, min(campingareatype.price) AS minPrice FROM campground JOIN campingareatype ON campground.campGroundID = campingareatype.campGroundID GROUP BY campingareatype.campGroundID;
  const sql =
    'SELECT campground.*, min(campingareatype.price) AS minPrice FROM campground JOIN campingareatype ON campground.campGroundID = campingareatype.campGroundID GROUP BY campingareatype.campGroundID;'

  //非同步async/await 將sql抓到檔案存入陣列
  const [data] = await db.query(sql)
  res.json(data) //回傳json格式
})

//* 寫入購物車資料
router.post('/campCart', async (req, res) => {
  // res.json('成功進入 -> /campCart 路由。')
  // return res.json(req.body)
  //# 先解構 req.body 的資料.
  let {
    DatePickGoToCart,
    CampgroundName,
    campName,
    campPrice,
    tentsPeople,
    tentsPrice,
    optionPrice
  } = req.body
  console.log(req.body)
  try {
    const V4 = uuidv4()
    const Year = DatePickGoToCart.Year
    const Month = DatePickGoToCart.Month
    const Day = DatePickGoToCart.Day
    const total = optionPrice.total
    const optionNameArr =
      optionPrice.optionNameArr.length > 0 ? optionPrice.optionNameArr : 'N'
    const optionNumArr =
      optionPrice.optionNumArr.length > 0 ? optionPrice.optionNumArr : 'N'
    const optionPriceArr =
      optionPrice.optionPriceArr.length > 0 ? optionPrice.optionPriceArr : 'N'
    //* console.log() 資料比對資料庫格式.
    console.log(`
        INSERT INTO campcart (orderID, user_id, Year, Month, Day, CampgroundName, campName, campPrice, tentsPeople, tentsPrice, total, optionNameArr, optionNumArr, optionPriceArr, Payment)
        VALUES (${V4}, ${req.jwtData.user_id}, ${Year}, ${Month}, ${Day}, ${CampgroundName}, ${campName}, ${campPrice}, ${tentsPeople}, ${tentsPrice}, ${total}, ${optionNameArr[0]}, ${optionNumArr[0]}, ${optionPriceArr[0]}, 0);
      `)
    for (let i = 0; i < optionNameArr.length; i++) {
      const campcart = `INSERT INTO campcart (orderID, user_id, Year, Month, Day, CampgroundName, campName, campPrice, tentsPeople, tentsPrice, total, optionNameArr, optionNumArr, optionPriceArr, Payment)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`
      //* 將資料寫入資料庫.
      const result = await db.query(campcart, [
        V4,
        req.jwtData.user_id,
        Year,
        Month,
        Day,
        CampgroundName,
        campName,
        campPrice,
        tentsPeople,
        tentsPrice,
        total,
        optionNameArr[i],
        optionNumArr[i],
        optionPriceArr[i]
      ])
      console.log('成功寫入資料', result)
    }
  } catch (ex) {
    console.log('campcart 資料寫入失敗', ex)
  }
})

//* 購物車清單
router.get('/campCartList', async (req, res) => {
  // res.json('test OK')
  // SQL: SELECT * FROM campcart WHERE user_id = 4 AND Payment = 0;
  // SQL: SELECT * FROM `campcart` WHERE user_id = 4 GROUP BY orderTime ORDER BY orderTime DESC;
  const data = {
    campcart: [],
    orderS: []
  }
  const userID = req.jwtData.user_id
  const sqlCampCart = `SELECT * FROM campcart WHERE user_id = ${userID} AND Payment = 0;`
  const sqlOrderID = `SELECT * FROM campcart WHERE user_id = ${userID} AND Payment = 0 GROUP BY orderID ORDER BY orderTime DESC;`
  const [campcart] = await db.query(sqlCampCart)
  data.campcart = campcart
  const [orderS] = await db.query(sqlOrderID)
  data.orderS = orderS
  res.json(data)
})

//* 購物車 -> 單筆資料刪除
router.post('/campCartDelete', async (req, res) => {
  // res.json('成功進入 -> campCartDelete 路由。')
  // SQl: DELETE FROM campcart WHERE campcart.orderID = '5131dda8-4377-4dfb-8556-a8eaf98fec93';
  const orderID = req.body.OrderID
  if (orderID) {
    try {
      const sqlDel = `DELETE FROM campcart WHERE campcart.orderID = '${orderID}'`
      const [data] = await db.query(sqlDel)
      res.json(data)
    } catch (ex) {
      console.log(ex)
    }
  }
})
//!
let order = {}
//* 購物車 -> 完成結帳更新資料庫欄位 Payment = 1
router.post('/campCartUpdate', async (req, res) => {
  // return res.json('成功進入 -> campCartUpdate 路由。')
  // console.log('req.body-------------', req.body)
  // return req.body
  // req.body =>
  //   {
  //   paymentOrderID: [
  //     'ee9cfe16-5fc7-4ef2-a86e-f5b6e7f02c8f',
  //     '82e7fc44-e0ba-4924-bec0-d582dc7c556c'
  //   ],
  //   paymentTime: '2023-10-13'
  // }
  //# linePay_ 準備LinePay 資料。 丟入前端缺少的 orderId: '', (// 後端產生uuidV4)
  const orderId = parseInt(new Date().getTime() / 1000)
  let { LINEPAYorder, paymentOrderID, paymentTime } = req.body
  // console.log('LINEPAYorder-----', LINEPAYorder)
  LINEPAYorder.body.orderId = orderId
  LINEPAYorder.body.packages[0].products[0].name = orderId
  order = { LINEPAYorder, paymentOrderID, paymentTime }
  // console.log('155----', LINEPAYorder.body.orderId)
  //# linePay_ 解構放置 redirectUrls 參數 2 個。
  const linePayBody = {
    ...LINEPAYorder.body,
    redirectUrls: {
      confirmUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`,
      cancelUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CANCEL_URL}`
    }
  }

  try {
    //# linePay_定義uri & nonce
    const uri = '/payments/request'
    //# 重構成全域的方法。 影片1小時04分
    const headers = createSignature(uri, linePayBody)

    //# linePay_ 準備完整的api路徑 後發出請求。
    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`
    const linePayRes = await axios.post(url, linePayBody, { headers })
    //# linePay_察看結果.//* inspect -> 可以讀取到深層結構。
    // console.log('linePayRes------------------------', linePayRes)
    // console.log(
    //   'linePayRes-----------',
    //   util.inspect(linePayRes, { depth: Infinity, colors: true })
    // )
    //# linePay_查看付款網址。
    // console.log('linePay_查看付款網址', linePayRes.data.info.paymentUrl.web)
    if (linePayRes?.data?.returnCode === '0000') {
      const result = linePayRes?.data?.info.paymentUrl.web
      // console.log('result---lineUrl', result)
      res.json(result)
      // res.redirect(linePayRes?.data?.info.paymentUrl.web)
    }
  } catch (error) {
    console.log('linePay 錯誤訊息 ------', error)
  }
  return
  //# 先解構。 寫入資料庫完成付款.
  // let { paymentOrderID, paymentTime } = req.body
  //* 避免掉資料不正確。
  if (typeof req.body !== 'object') {
    return res.json({ msg: 'no data' })
  }
  //* db.escape =  避免 SQL 注入攻擊 和 字串做跳脫字元處理。
  const orderIDs = paymentOrderID.map(v => db.escape(v))
  // console.log({ orderIDs })

  if (orderIDs.length) {
    try {
      const sqlUpdate = `UPDATE campcart SET Payment = 1, PaymentTime='${paymentTime}' WHERE orderID IN (${orderIDs.join(
        ','
      )})`
      // console.log({ sqlUpdate })
      const [result] = await db.query(sqlUpdate)
      return res.json(result)
    } catch (ex) {
      console.log(ex)
    }
  }
  res.json({ msg: 'something wrong!' })
})
//# LinePay 接收訂單資料。
router.get('/linePay/confirm/:transactionId/:orderId', async (req, res) => {
  console.log('217-----', req.params)
  console.log('order-----', order)
  try {
    //* 比對本地端訂單。
    const transactionId = req.params.transactionId
    const orderId = req.params.orderId
    // const { transactionId, orderId } = req.query
    console.log('比對本地端訂單', transactionId, orderId)
    // const order = LINEPAYorder.body.orderId
    const linePayBody = {
      amount: order.LINEPAYorder.body.amount,
      currency: 'TWD'
    }
    const uri = `/payments/${transactionId}/confirm`
    const headers = createSignature(uri, linePayBody)
    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`
    const linePayRes = await axios.post(url, linePayBody, { headers })
    console.log('linePayRes-------', linePayRes?.data)
    console.log('136---------', order)

    //# 寫入資料庫.
    // if (linePayRes.data.returnCode === '0000') {
    // }
    //* db.escape =  避免 SQL 注入攻擊 和 字串做跳脫字元處理。
    const orderIDs = order.paymentOrderID.map(v => db.escape(v))
    // console.log('245----------', orderIDs)
    if (orderIDs.length) {
      try {
        const sqlUpdate = `UPDATE campcart SET Payment = 1, PaymentTime= now(), orderID=${
          order.LINEPAYorder.body.orderId
        } WHERE orderID IN (${orderIDs.join(',')})`
        // console.log({ sqlUpdate })
        const [result] = await db.query(sqlUpdate)
        return res.json(result)
      } catch (ex) {
        console.log(ex)
      }
      res.json(linePayRes) //TODO 回傳line pay 資料.
    }
  } catch (error) {
    console.log('LinePay 接收訂單資料---錯誤', error)
  }
  res.end()
})

//* 營地預定 歷史訂單查詢 SQL: SELECT * FROM campcart WHERE user_id = 4 AND Payment = 1 ORDER BY PaymentTime DESC;

//* 營地清單 -> 營地單項 SQL 放置最下方 避免路由衝突。
router.get('/:cID', async (req, res) => {
  //加入sql語法
  const data = {
    campsite: [],
    option: []
  }
  const cID = parseInt(req.params.cID)
  //! 判斷cID == NaN 的時候。 離開路由，避免造成錯誤。
  if (isNaN(cID)) {
    return res.send('路由方式使用錯誤了 =_= 別再進來cID惹~~~~~~。')
  }

  const sqlCampsite = `SELECT * FROM campground JOIN campingareatype ON campground.campGroundID = campingareatype.campGroundID WHERE campground.campGroundID = ${cID}`
  const sqlOption = `SELECT * FROM campingareatype JOIN campgroundadditionaloptions ON campingareatype.campingAreaTypeID = campgroundadditionaloptions.campingAreaTypeID;`

  //非同步async/await 將sql抓到檔案存入陣列c
  const [campsite] = await db.query(sqlCampsite) // 營地營區資料
  data.campsite = campsite
  const [option] = await db.query(sqlOption) // 營區跟加選方案資料
  data.option = option
  res.json(data) //回傳json格式
})

//# linePay_ 全域的方法。
function createSignature(uri, linePayBody) {
  const nonce = parseInt(new Date().getTime() / 1000)
  const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(
    linePayBody
  )}${nonce}`
  //# linePay_準備簽章.Base64.stringify()
  const signature = Base64.stringify(
    HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY)
  )
  //# linePay_ Base64加密後的簽章送到 headers.
  const headers = {
    'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
    'Content-Type': 'application/json',
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': signature
  }
  return headers
}

export default router
//nodemon index.js 就可以開啟localhost:3003/"你的路由名稱"
