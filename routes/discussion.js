import express from "express";
import db from "./../modules/connect-mysql.js";
import multer from "multer";

const router = express.Router();
//由此開始撰寫路由
export default router;
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/discussion");
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.originalname.split(".")[0] +
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
router.post("/addMsg", upload.single("img"), async (req, res) => {
    const img = req.file.filename;
    const user_id = req.jwtData.user_id;
    const { msgcategory, title, content } = req.body;

    const sql =
        "INSERT INTO msgs (userID, msgcategory, title, content,img) VALUES (?, ?, ?, ?, ?)";
    try {
        const result = await db.query(sql, [
            user_id,
            msgcategory,
            title,
            content,
            `http://localhost:3003/discussion/${img}`,
        ]);

        console.log("成功寫入資料", result[0].insertId);
        res.json({ message: "資料寫入成功", id: result[0].insertId });
    } catch (ex) {
        console.log("addMsg 資料寫入失敗" + ex);
        res.json({ message: "資料寫入失敗" });
    }
});

router.get("/articlelist", async (req, res) => {
    const articleId = req.query.id;
    const sql = "UPDATE msgs SET browse = browse + 1 WHERE id = ?";
    try {
        await db.query(sql, [articleId]);
        res.json({ message: "瀏覽人數更新成功" });
    } catch (ex) {
        console.log("瀏覽人數更新失敗", ex);
        res.json({ message: "瀏覽人數更新失敗" });
    }
});

router.get("/reply", async (req, res) => {
    const sql =
        "SELECT reply.*,members.user_name FROM `reply` join members ON members.user_id = reply.userID";
    const [row] = await db.query(sql);
    res.json(row);
});
router.post("/reply", async (req, res) => {
    const reply_content = req.body.content;
    const article_id = req.body.article_id;
    const user_id = 4
    console.log("reply_content")
    console.log(reply_content)
    console.log("article_id")
    console.log(article_id)
    const sql = "INSERT INTO `reply` ( userID, articleID, replycontent) VALUES (?, ?, ?)"
    const [row] = await db.query(sql, [user_id, article_id, reply_content])
    res.json(row)
})


router.get("/msgs", async (req, res) => {
    const sql =
        "SELECT msgs.*,msgcategory.categoryname,msgcategory.uid,members.user_name,members.user_img FROM `msgs` join msgcategory ON msgs.msgcategory = msgcategory.uid join members on members.user_id = msgs.userID";
    const [row] = await db.query(sql);
    res.json(row);
});

router.get("/msgcategory", async (req, res) => {
    const sql = "SELECT uid,categoryname FROM `msgcategory`";
    const [row] = await db.query(sql);
    res.json(row);
});

router.get("/TOP5", async (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM `msgs` WHERE 1 ORDER BY browse DESC LIMIT 5;";
    const [row] = await db.query(sql, [id]);
    console.log(122);
    res.json(row);
});

router.get("/:id", async (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM `msgs` WHERE id = ?";
    const [row] = await db.query(sql, [id]);
    res.json(row[0]);
});
