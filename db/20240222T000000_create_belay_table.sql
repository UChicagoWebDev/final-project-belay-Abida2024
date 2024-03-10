create table if not exists users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(40) UNIQUE,
  password VARCHAR(40),
  api_key VARCHAR(40)
);

create table if not exists channels (
  id INTEGER PRIMARY KEY,
  name VARCHAR(40) UNIQUE
);

create table if not exists messages (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  channel_id INTEGER,
  body TEXT,
  reply_to INTEGER, 
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id)
);