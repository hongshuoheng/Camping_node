import express from "express";
import db from "./../modules/connect-mysql.js";
import crypto from "crypto";
import ecpay_payment from "ecpay_aio_nodejs";
import "dotenv/config.js"; // 存取`.env`設定檔案使用

const router = express.Router();
// console.log(router);
//由此開始撰寫路由

//綠界pay

// 綠界提供的 SDK

const { MERCHANTID, HASHKEY, HASHIV, HOST } = process.env;

// SDK 提供的範例，初始化
// https://github.com/ECPay/ECPayAIO_Node.js/blob/master/ECPAY_Payment_node_js/conf/config-example.js
const options = {
  OperationMode: "Test", //Test or Production
  MercProfile: {
    MerchantID: MERCHANTID,
    HashKey: HASHKEY,
    HashIV: HASHIV,
  },
  IgnorePayment: [
    //    "Credit",
    //    "WebATM",
    //    "ATM",
    //    "CVS",
    //    "BARCODE",
    //    "AndroidPay"
  ],
  IsProjectContractor: false,
};
let TradeNo;
router.post("ecpay2", async (req, res) => {
  console.log(12333);
  res(123);
});
router.post("/ecpay", async (req, res) => {
  // SDK 提供的範例，參數設定
  // https://github.com/ECPay/ECPayAIO_Node.js/blob/master/ECPAY_Payment_node_js/conf/config-example.js
  console.log("req");
  const MerchantTradeDate = new Date().toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  TradeNo = "test" + new Date().getTime();
  const user_id = req.jwtData.user_id;
  const [prs] = await db.query(
    "SELECT cart.pcs_purchased,product.product_name,product.unit_price, CONCAT('(顏色:',color.spec_name,' || 尺寸:',size.spec_name,' || 材質:',material.spec_name,')')AS type FROM cart JOIN inventory ON inventory.inventory_id = cart.inventory_id JOIN spec AS color ON color_spec=color.spec_id JOIN spec AS size ON size_spec=size.spec_id JOIN spec AS material ON material_spec=material.spec_id JOIN product ON product.product_id = inventory.product_id where cart.user_id = ?;",
    [user_id]
  );
  const productName = prs.map((v) => v.product_name).join(",");
  console.log(productName);
  let total = 0;
  for (let p of prs) {
    total += p.pcs_purchased * p.unit_price + 60;
    total = total.toString();
  }
  console.log(total);

  // return res.json({ p: productName, price: total });
  let base_param = {
    MerchantTradeNo: TradeNo, //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
    MerchantTradeDate,
    TotalAmount: total, //這邊要填金額
    TradeDesc: "露營生活",
    ItemName: productName, //這邊要填商品名稱
    ReturnURL: `${HOST}/return`,
    ClientBackURL: `${HOST}`,
  };
  const create = new ecpay_payment(options);

  // 注意：在此事直接提供 html + js 直接觸發的範例，直接從前端觸發付款行為
  const html = create.payment_client.aio_check_out_all(base_param);
  console.log(html);
  res.json(html);

  // res.render("index", {
  //   title: "Express",
  //   html,
  // });
});

// 後端接收綠界回傳的資料
router.post("/return", async (req, res) => {
  console.log("req.body:", req.body);

  const { CheckMacValue } = req.body;
  const data = { ...req.body };
  delete data.CheckMacValue; // 此段不驗證

  const create = new ecpay_payment(options);
  const checkValue = create.payment_client.helper.gen_chk_mac_value(data);

  console.log(
    "確認交易正確性：",
    CheckMacValue === checkValue,
    CheckMacValue,
    checkValue
  );

  // 交易成功後，需要回傳 1|OK 給綠界
  res.send("1|OK");
});

// 用戶交易完成後的轉址
router.get("/clientReturn", (req, res) => {
  console.log("clientReturn:", req.body, req.query);
  res.render("return", { query: req.query });
});

//綠界ends

const callback_url = process.env.SHIP_711_STORE_CALLBACK_URL;

// POST 選擇完門市後會把資料送來這支然後post回去前端頁面(購物車)
router.post("/cart/711", function (req, res, next) {
  // console.log(req.body);
  let searchParams = new URLSearchParams(req.body);
  res.redirect(callback_url + "?" + searchParams.toString());
});

router.get("/", async (req, res) => {
  // ***這邊的/己經是/product/ --> 開始***
  // console.log(req);
  // console.log(req.query);
  //搜尋功能

  let search = req.query.search || "";
  console.log(search);
  let searchEsc = "";
  search = search.trim(); //去除頭尾空白
  let where = " WHERE 1 "; //sql條件篩選

  if (search) {
    searchEsc = db.escape(`%${search}%`);
    where += ` AND (product.product_name LIKE ${searchEsc} OR product.product_description LIKE ${searchEsc})`;
  }

  let category = req.query.category || "";
  if (category !== "") {
    if (category === "特價中") {
      where += ` AND (productdiscount.discount IS NOT NULL)`;
    } else {
      where += ` AND (category.category_name = "${category}" OR category.sub_category_name = "${category}")`;
    }
  }

  //加入sql語法
  const sql = `SELECT product.*, productdiscount.discount_info,productdiscount.discount, SUM(inventory.quantity) AS STOCK, category.* FROM product LEFT JOIN productdiscount ON product.product_id = productdiscount.product_id LEFT JOIN inventory ON product.product_id = inventory.product_id JOIN category ON product.category_id = category.category_id ${where} GROUP BY product.product_id;`;
  //非同步async/await 將sql抓到檔案存入陣列
  const [data] = await db.query(sql);
  res.json(data); //回傳json格式
});
// 購物車路由 starts here

router.get("/cart", async (req, res) => {
  // res.json("123")
  const user_id = req.jwtData.user_id;
  const sql = `SELECT cart.*,product.*,color_spec.spec_name as COLOR,material_spec.spec_name as MATERIAL,size_spec.spec_name as SIZE FROM cart
LEFT JOIN inventory ON cart.inventory_id = inventory.inventory_id
LEFT JOIN product ON product.product_id = inventory.product_id
LEFT JOIN spec AS color_spec ON inventory.color_spec = color_spec.spec_id
LEFT JOIN spec AS material_spec ON inventory.material_spec = material_spec.spec_id
LEFT JOIN spec AS size_spec ON inventory.size_spec = size_spec.spec_id
WHERE user_id = ${user_id};`;
  const [cart] = await db.query(sql);
  res.json(cart);
});
//加入購物車
router.post("/addProductToCart", async (req, res) => {
  let output = {
    success: "",
    msg: "",
  };
  if (!req.jwtData) {
    output.success = false;
    output.msg = "請先登入";
    return res.json(output);
  } else {
    const { color_spec, size_spec, material_spec, product_id } = req.body;
    const [row1] = await db.query(
      "SELECT quantity,inventory_id FROM `inventory` WHERE `product_id`=? AND size_spec=? AND color_spec=? AND material_spec=?",
      [product_id, size_spec, color_spec, material_spec]
    );
    if (!row1.length) {
      output.success = false;
      output.msg = "很抱歉，本公司沒有供應此產品規格";
      output.data = req.body;
      return res.json(output);
    } else if (!row1[0].quantity > 0) {
      output.success = false;
      output.msg = "很抱歉，此產品規格組合已無庫存，請挑選其他規格";
      return res.json(output);
    } else {
      const [cartRow] = await db.query(
        `
      SELECT cart_id,pcs_purchased FROM cart WHERE user_id = ? AND inventory_id =? `,
        [req.jwtData.user_id, row1[0].inventory_id]
      );
      if (cartRow.length > 0) {
        output.success = false;
        output.msg = "購物車內已經有此商品";
        return res.redirect(
          307,
          `/product/updateProductCart?value=${
            cartRow[0].pcs_purchased + 1
          }&inventory_id=${row1[0].inventory_id}`
        );
      }
      const [row2] = await db.query(
        "INSERT INTO `cart` ( `pcs_purchased`, `user_id`, `inventory_id`) VALUES ( 1, ?, ?)",
        [req.jwtData.user_id, row1[0].inventory_id]
      );
      if (row2.affectedRows) {
        output.success = true;
        output.msg = "新增購物車成功";
        output.data = row2;
        return res.json(output);
      }
    }
  }
  res.json(req.body);
});

router.get("/demo2", (req, res) => {
  res.json(req.query);
});

//更新購物車數量
router.post("/updateProductCart", async (req, res) => {
  let output = {
    success: "",
    msg: "",
  };
  if (!req.jwtData) {
    output.success = false;
    output.msg = "請先登入";
    return res.json(output);
  } else {
    const { value, inventory_id } = req.query;
    if (value <= 0) {
      const delSql = `DELETE FROM cart WHERE user_id = ? AND inventory_id= ?`;
      await db.query(delSql, [req.jwtData.user_id, inventory_id]);
      output.success = true;
      output.msg = "此品項已經刪除";
      return res.json(output);
    } else {
      const updatePCountSql = `UPDATE cart SET pcs_purchased=? WHERE user_id = ? AND inventory_id = ?`;

      await db.query(updatePCountSql, [
        value,
        req.jwtData.user_id,
        inventory_id,
      ]);
      output.success = true;
      output.msg = "購物車數量已更新";
      return res.json(output);
    }

    // if (row2.affectedRows) {
    //   output.success = true;
    //   output.msg = "新增購物車成功";
    //   output.data = row2;
    //   return res.json(output);
    // }
  }
});

//加入訂單
router.post("/purchase", async (req, res) => {
  let output = {
    code: 400,
    success: false,
    msg: "",
  };
  if (!req.jwtData) {
    output.msg = "會員驗證失敗";
    return res.json(output);
  } else if (!req.body.payment_id) {
    output.msg = "發生錯誤，付款資訊不足";
    return res.json(output);
  } else {
    const user_id = req.jwtData.user_id;
    const payment_id = req.body.payment_id;
    const [carts] = await db.query("SELECT * FROM cart WHERE user_id = ?", [
      user_id,
    ]);
    if (!carts.length) {
      output.msg = "發生錯誤，購物車沒有產品";
      return res.json(output);
    }
    //檢查庫存
    for (let cart of carts) {
      const [inventory] = await db.query(
        `SELECT product.product_name,CONCAT("(顏色:",color.spec_name," || 尺寸:",size.spec_name," || 材質:",material.spec_name,")") AS type,inventory.quantity FROM inventory JOIN product ON inventory.product_id=product.product_id JOIN spec AS color ON color_spec=color.spec_id JOIN spec AS size ON size_spec=size.spec_id JOIN spec AS material ON material_spec=material.spec_id WHERE inventory_id = ?`,
        [cart.inventory_id]
      );
      if (cart.pcs_purchased > inventory[0].quantity) {
        output.msg = `很抱歉，${inventory[0].product_name} ${inventory[0].type} 這項產品庫存僅剩${inventory[0].quantity}件。`;
        return res.json(output);
      }
    }
    //建立訂單
    const [purchase] = await db.query(
      "INSERT INTO `purchase` ( `purchase_date`, `delivery_status`, `payment_id`, `user_id`) VALUES ( now(), '未送達', ?, ?) ",
      [payment_id, user_id]
    );
    if (!purchase.affectedRows) {
      output.msg = "建立訂單發生錯誤，請稍後再試";
      return res.json(output);
    } else {
      const purchase_id = purchase.insertId;
      let details = [];
      for (let cart of carts) {
        details.push(
          new Array(cart.pcs_purchased, cart.inventory_id, purchase_id)
        );
      }
      //建立訂單明細
      const [createDetail] = await db.query(
        "INSERT INTO `purchase_details` (`pcs_purchased`, `inventory_id`, `purchase_id`) VALUES ? ",
        [details]
      );
      if (createDetail.affectedRows) {
        //更新庫存
        for (let cart of carts) {
          await db.query(
            "UPDATE `inventory` SET `quantity` = `quantity`- ? WHERE `inventory`.`inventory_id` = ?",
            [cart.pcs_purchased, cart.inventory_id]
          );
        }
        //刪除購物車
        const [final] = await db.query("DELETE FROM cart WHERE user_id=?", [
          user_id,
        ]);
        if (final.affectedRows) {
          output.code = 200;
          output.success = true;
          output.msg = "訂單已成立，感謝您的購買";
          return res.json(output);
        }
      }
    }
  }
});

// PID 動態路由 starts here
router.get("/:pid", async (req, res) => {
  const colorSpecSQL = `SELECT color_spec, spec_name FROM inventory JOIN spec ON inventory.color_spec = spec.spec_id where product_id = ? GROUP BY color_spec `;
  const sizeSpecSQL = `SELECT size_spec, spec_name FROM inventory JOIN spec ON inventory.size_spec = spec.spec_id where product_id = ? GROUP BY size_spec `;
  const materialSpecSQL = `SELECT material_spec, spec_name FROM inventory JOIN spec ON inventory.material_spec = spec.spec_id where product_id = ? GROUP BY material_spec `;
  const [colorSpec] = await db.query(colorSpecSQL, [req.params.pid]);
  const [sizeSpec] = await db.query(sizeSpecSQL, [req.params.pid]);
  const [materialSpec] = await db.query(materialSpecSQL, [req.params.pid]);
  res.colorSpec = colorSpec;
  res.sizeSpec = sizeSpec;
  res.materialSpec = materialSpec;

  let output = { data: [], colorSpec: [], sizeSpec: [], materialSpec: [] };
  output.colorSpec = colorSpec;
  output.sizeSpec = sizeSpec;
  output.materialSpec = materialSpec;

  if (!req.jwtData) {
    // const sql = `SELECT * FROM product WHERE product_id = ${req.params.pid}`;
    // const sql = `SELECT * FROM product WHERE product.product_id = ${req.params.pid}`;
    const sql = `SELECT product.*,productdiscount.*,category.*, SUM(inventory.quantity) AS STOCK FROM product LEFT JOIN productdiscount ON product.product_id = productdiscount.product_id LEFT JOIN inventory ON product.product_id = inventory.product_id LEFT JOIN category ON product.category_id = category.category_id WHERE product.product_id = ${req.params.pid} GROUP BY product.product_id`;

    const [data] = await db.query(sql);
    output.data = data;

    res.json(output); //回傳json格式
  } else {
    const sql = `SELECT product.*,productdiscount.*, category.*, inventory.*, SUM(inventory.quantity) AS STOCK, bookmark_product.id as favorite FROM product LEFT JOIN inventory ON product.product_id = inventory.product_id LEFT JOIN productdiscount ON product.product_id = productdiscount.product_id LEFT JOIN category ON product.category_id = category.category_id LEFT JOIN bookmark_product ON product.product_id = bookmark_product.product_id AND bookmark_product.user_id=${req.jwtData.user_id} WHERE product.product_id = ${req.params.pid}  GROUP BY product.product_id`;

    // const sql = `SELECT product.*,bookmark_product.id as favorite FROM product LEFT JOIN bookmark_product ON product.product_id = bookmark_product.product_id AND bookmark_product.user_id=${req.jwtData.user_id} WHERE product.product_id = ${req.params.pid} `;
    const [data] = await db.query(sql);
    output.data = data;
    console.log(req.jwtData.user_id);
    res.json(output); //回傳json格式
  }
});

export default router;
