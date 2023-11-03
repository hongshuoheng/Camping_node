import http from "node:http"; //node: 表示是node底下的套件
import fs from "node:fs/promises";

const server = http.createServer(async (req, res) => {
  await fs.writeFile("./headers.txt", JSON.stringify(req.headers, null, 4));

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });

  res.end(`<h2>寫入完成</h2>
  <p>${req.url}</p>`);

  // res.writeHead(200, {
  //   "Content-Type": "text/html; charset=utf-8",
  // });
  // res.end(`<h2>尼好好好</h2>
  // <p>${req.url}</p>`);
});

server.listen(3000);
