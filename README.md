# Rethink Chat

A NodeJS+Vue chat app using RethinkDB and SocketIO.
It features a bot for your entertainment, address it with `@lorem`.

Find it running at https://rethink-chat-socketio.herokuapp.com/

## Run migrations

```
node migrate.js
```

## Run lorem bot

```
node lorem-bot.js
```

## Run app

```
node index.js
```

## Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

_Note: deploy button seems to currently not work (probably because addon is in alpha)._

```
heroku create
heroku addons:add rethinkdb
git push heroku master
```

_Note: the lorem bot needs to be enabled manually on the apps resources dashboard_
