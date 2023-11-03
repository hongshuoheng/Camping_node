import multer from "multer"; //middleware用來處理multipart/form-data content type

import { v4 as uuidv4 } from "uuid";

//定義可接受的檔案類型
const extMap = {
  "image/jpeg": ".jpg",
  "image/png": "png",
  "image/webp": "webp",
};

//先篩選檔案，再決定要不要儲存
const fileFilter = (req, file, callback) => {
  callback(null, !!extMap[file.mimetype]); // !!轉換成Boolean
};

//設定儲存路徑和檔名
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "public/img");
  },
  filename: (req, file, callback) => {
    const f = uuidv4() + extMap[file.mimetype];
    callback(null, f);
  },
});

const upload = multer({ fileFilter, storage });

export default upload;
