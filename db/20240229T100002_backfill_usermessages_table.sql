insert into latest_user_messages 
(
    user_id, 
    channel_id, 
    latest_message_seen
) select 
    users.id, 
    channels.id, 
    0
    from users cross join channels;

