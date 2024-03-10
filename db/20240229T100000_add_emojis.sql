create table emojis (
  id INTEGER PRIMARY KEY,
  emoji_id INTEGER,
  message_id INTEGER, 
  user_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(message_id) REFERENCES messages(id)
);