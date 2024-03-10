create table latest_user_messages (
  user_id INTEGER, 
  channel_id INTEGER, 
  latest_message_seen INTEGER, 
  PRIMARY KEY (user_id, channel_id)
);