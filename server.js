const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "change-me";

app.use(cors());

let lastFrame = null;
let lastFrameAt = 0;
const clients = new Set();

function writeFrame(res, frame) {
  res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
  res.write(frame);
  res.write("\r\n");
}

app.post("/upload", express.raw({ type: "image/jpeg", limit: "2mb" }), (req, res) => {
  if (req.query.key !== API_KEY) return res.status(401).send("bad key");
  if (!req.body || !req.body.length) return res.status(400).send("no frame");

  lastFrame = req.body;
  lastFrameAt = Date.now();
  for (const c of clients) writeFrame(c, lastFrame);
  res.sendStatus(200);
});

app.get("/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Connection: "keep-alive",
  });
  clients.add(res);
  if (lastFrame) writeFrame(res, lastFrame);
  req.on("close", () => clients.delete(res));
});

app.get("/snapshot", (req, res) => {
  if (!lastFrame) return res.status(404).send("no frame yet");
  res.set("Content-Type", "image/jpeg");
  res.send(lastFrame);
});

app.get("/status", (req, res) => {
  res.json({
    online: lastFrame !== null && Date.now() - lastFrameAt < 5000,
    lastFrameSecondsAgo: lastFrame ? Math.round((Date.now() - lastFrameAt) / 1000) : null,
    viewers: clients.size,
  });
});

app.get("/", (req, res) => res.send("AGROGENIUS cam relay running"));

app.listen(PORT, () => console.log("Listening on port " + PORT));