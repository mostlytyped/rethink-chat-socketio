// index.js

// Setup express and socket.io servers
var express = require("express");
const app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

// Logging middleware
var morgan = require("morgan");
app.use(morgan("combined"));

// Serve frontend
app.use(express.static("public"));

// Keep track of room subscriptions in RethinkDB
const watchedRooms = {};

// Lazy RethinkDB connection
var r = require("rethinkdb");
let rdbConn = null;
const rdbConnect = async function () {
  try {
    const conn = await r.connect({
      host: process.env.RETHINKDB_HOST || "localhost",
      port: process.env.RETHINKDB_PORT || 28015,
      username: process.env.RETHINKDB_USERNAME || "admin",
      password: process.env.RETHINKDB_PASSWORD || "",
      db: process.env.RETHINKDB_NAME || "test",
    });

    // Handle close
    conn.on("close", function (e) {
      console.log("RDB connection closed: ", e);
      rdbConn = null;
    });

    console.log("Connected to RethinkDB");
    rdbConn = conn;
    return conn;
  } catch (err) {
    throw err;
  }
};
const getRethinkDB = async function () {
  if (rdbConn != null) {
    return rdbConn;
  }
  return await rdbConnect();
};

// Route to access a room
app.get("/chats/:room", async (req, res) => {
  const conn = await getRethinkDB();

  const room = req.params.room;
  let query = r.table("chats").filter({ roomId: room });

  // Subscribe to new messages
  if (!watchedRooms[room]) {
    query.changes().run(conn, (err, cursor) => {
      if (err) throw err;
      cursor.each((err, row) => {
        if (row.new_val) {
          // Got a new message, send it via socket.io
          io.emit(room, row.new_val);
        }
      });
    });
    watchedRooms[room] = true;
  }

  // Return message history & socket.io handle to get new messages
  let orderedQuery = query.orderBy(r.desc("ts"));
  orderedQuery.run(conn, (err, cursor) => {
    if (err) throw err;
    cursor.toArray((err, result) => {
      if (err) throw err;
      res.json({
        data: result,
        handle: room,
      });
    });
  });
});

// Socket.io (listen for new messages in any room)
io.on("connection", (socket) => {
  socket.on("chats", async (msg) => {
    const conn = await getRethinkDB();
    r.table("chats")
      .insert(Object.assign(msg, { ts: Date.now() }))
      .run(conn, function (err, res) {
        if (err) throw err;
      });
  });
});

// HTTP server (start listening)
const listenPort = process.env.PORT || "3000";
http.listen(listenPort, () => {
  console.log("listening on *:" + listenPort);
});
