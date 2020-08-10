var rethink = require('rethinkdb');

var express = require('express');
var morgan = require('morgan')
const app = express();
app.use(morgan('combined'))

var http = require('http').createServer(app);
var io = require('socket.io')(http);

const rdbHost = process.env.RETHINKDB_HOST;
const rdbPort = process.env.RETHINKDB_PORT;
const rdbName = process.env.RETHINKDB_NAME;
const rdbUser = process.env.RETHINKDB_USERNAME;
const rdbPass = process.env.RETHINKDB_PASSWORD;

const listenPort = process.env.PORT || "3000";

rethink.connect({ host: rdbHost, port: rdbPort, username: rdbUser, password: rdbPass, db: rdbName }, function (err, conn) {
    if (err) throw err;

    const watchedQueries = {};

    app.use(express.static('public'));

    app.get('/db/:table', (req, res) => {
        let query = rethink.table(req.params.table);
        let orderBy = req.query.orderBy;
        let order = req.query.order;
        delete req.query.orderBy;
        delete req.query.order;
        query = query.filter(req.query);
        let orderedQuery = query;
        if (orderBy) {
            if (order === 'desc') {
                orderBy = rethink.desc(orderBy);
            } else {
                orderBy = rethink.asc(orderBy);
            }
            orderedQuery = query.orderBy(orderBy);
        }
        orderedQuery.run(conn, (err, cursor) => {
            if (err) throw err;
            cursor.toArray((err, result) => {
                if (err) throw err;
                res.json({
                    data: result,
                    handle: handle
                });
            })
        });
        const handle = req.params.table + '/' + Object.entries(req.query).map(e => e.join('=')).join('/');
        if (!watchedQueries[handle]) {
            query.changes().run(conn, (err, cursor) => {
                if (err) throw err;
                cursor.each((err, row) => {
                    if (row.new_val) {
                        io.emit(handle, row.new_val);
                    }
                });
            });
            watchedQueries[handle] = true;
        }
    })

    io.on('connection', (socket) => {
        socket.on('chats', (msg) => {
            rethink.table('chats').insert(Object.assign(msg, { ts: Date.now() })).run(conn, function (err, res) {
                if (err) throw err;
            });
        });
    });

    http.listen(listenPort, () => {
        console.log('listening on *:' + listenPort);
    });
});