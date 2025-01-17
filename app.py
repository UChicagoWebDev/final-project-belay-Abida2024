import string
import random
from datetime import datetime
from flask import *
from functools import wraps

import sqlite3

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/belay.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

@app.route("/")
@app.route("/profile")
@app.route('/profile')
@app.route('/login')
@app.route('/channel')
@app.route('/channel/<channel_id>')
@app.route('/channel/<channel_id>/reply/<reply_id>')
def index(channel_id=None, reply_id=None):
    return app.send_static_file("index.html")

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404

# -------------------------------- API ROUTES ----------------------------------
@app.route('/api/signup', methods=['GET'])
def signup():
    # creates a new user in the database
    # store in localStorage 
    # return api key for the user 
    u = new_user()
    api_key = u['api_key']
    
    # Insert the user into the user_messages_table
    query_db('''insert into latest_user_messages (user_id, channel_id, latest_message_seen)
        select users.id, channels.id, 0 from users cross join channels where users.id = ? 
        ''',[u['id']],one=True)

    return {
        'id': u['id'], 
        'username': u['name'],
        'password': u['password'],
        'api-key': api_key}, 200

# Note to grader: This is the authentication endpoint
@app.route('/api/login', methods=['POST'])
def login():
    # accepts a username and password
    # int the headers or request body 
    data = request.json 
    username = data['username']
    password = data['password']
    resp = query_db('select * from users where name=? and password=?', 
    [username, password], one=True)
    
    if resp is None:
        return {}, 404

    # returns the API key for the user 
    return {'api-key': resp['api_key']}, 200

# API endpoints require a valid API key in the request header.
def validate_api_key(request):
    api_key = request.headers['API-Key']
    # check that the api key exists
    resp = query_db('select * from users where api_key=?',[api_key],one=True)
    if resp['api_key'] == api_key:
        return resp, True
    return {}, False

# For populating the user information given the endpoint
@app.route('/api/user/key', methods = ['GET'])
def get_user_from_key():
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    # check that the api key exists
    return {'user_id': u['id'], 'name': u['name'], 'password': u['password']}, 200

# POST to change the user's name
@app.route('/api/user/changename', methods = ['POST'])
def update_username():
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    data = request.json 
    user_id = u['id']
    new_username = data['username']
    # The user name has to be unique 
    resp = query_db('update users set name=? where id=? returning name''', [new_username, user_id], one=True)
    return {'username': resp['name']}, 200

# POST to change the user's password
@app.route('/api/user/changepassword', methods = ['POST'])
def update_password():
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    data = request.json 
    user_id = u['id']
    new_password = data['password']
    resp = query_db('update users set password=? where id=? returning password', [new_password, user_id], one=True)
    return {'password': resp['password']}, 200

# ------------------------------------------------ CHANNEL ENDPOINTS ----------------------------------------------
@app.route('/api/channels/new', methods=['GET'])
def create_channel():
    u, valid_key = validate_api_key(request);
    if not valid_key:
        return {}, 404
    
    name = "Unnamed Room " + ''.join(random.choices(string.digits, k=6))
    channel = query_db('insert into channels (name) values (?) returning id, name', [name], one=True)      
    # Set the latest read message for this channel to be 0 for all users:
    query_db('''insert into latest_user_messages (user_id, channel_id, latest_message_seen)
    select users.id, ?, 0 from users''', [channel['id']], one=True)

    return {'channel_id': channel['id'], 'name': channel['name']}, 200

@app.route('/api/channels/postemoji', methods=['POST'])
def post_emoji_to_message():
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    data = request.json
    emoji = query_db('insert into emojis (emoji_id, message_id, user_id) values (?, ?, ?) returning id', 
    [data['emoji_id'], data['message_id'], u['id']], one=True)            
    return {'emoji': emoji['id']}, 200

@app.route('/api/channels/postmessage', methods=['POST'])
def post_message_to_channel():
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    data = request.json
    message = query_db('insert into messages (user_id, channel_id, body, reply_to) values (?, ?, ?, ?) returning body', 
    [u['id'], data['channel_id'], data['body'], data['reply_to']], one=True)            
    return {'message_body': message['body']}, 200

# list of all channels and the number of unread messages per channel
@app.route('/api/channels/list', methods=['GET'])
def list_channels_unread_messages():
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    channels_unread = query_db(''' 
        select u.channel_id as channel_id, c.name as channel_name, count(m.id) as unread_messages 
        from latest_user_messages u left join channels c on u.channel_id = c.id
        left join messages m on c.id = m.channel_id and m.id > u.latest_message_seen
        where u.user_id = ? group by u.channel_id 
    ''', 
    [u['id']])     
    channels = []
    for channel in channels_unread:
        channels.append({
            'channel_id': channel['channel_id'],
            'channel_name': channel['channel_name'], 
            'unread_messages': channel['unread_messages']
        })
    return jsonify(channels), 200

# update unread messages
def update_unreadmessages_channels(user_id, channel_id):
    # update to the number of messages 
    channels_unread = query_db(''' 
        update latest_user_messages set latest_message_seen = 
        (select max(id) from messages where channel_id = ? group by channel_id) where user_id = ? 
        and channel_id = ? returning latest_message_seen
    ''', 
    [channel_id, user_id, channel_id], one=True)
    return channels_unread['latest_message_seen']

# get messages
@app.route('/api/channels/getmessages/<int:channel_id>', methods=['GET'])
def get_messages(channel_id):
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    # do a self join to return the responses
    messages = query_db('''select u1.name as name, a.id as id, a.body as body, u2.name as reply_name, b.id as reply_id, b.body as reply_body from messages a
        left join messages b on a.id = b.reply_to
        left join users u1 on a.user_id = u1.id
        left join users u2 on b.user_id = u2.id
        where a.channel_id = ? and a.reply_to is null''', [channel_id])
    if messages is None:
        return {}, 200
        
    all_messages = []
    messages_dict = {}
    for message in messages:
        if message['id'] not in messages_dict.keys():
            messages_dict[message['id']] = {
            'id': message['id'],
            'user_name': message['name'], 
            'body': message['body'],
            'replies': []
            }
        if message['reply_id'] is not None:
            messages_dict[message['id']]['replies'].append(
                {
                    'reply_id': message['reply_id'], 
                    'reply_user_name': message['reply_name'],
                    'body': message['reply_body'],
                }
            )
    all_messages = list(messages_dict.values())
    # TODO: Maybe move this somewhere else ? 
    latest_message_seen = update_unreadmessages_channels(u['id'], channel_id)
    return jsonify(all_messages), 200

@app.route('/api/channels/getmessagereplies/<int:message_id>', methods=['GET'])
def get_message_replies(message_id):
    u, valid_key = validate_api_key(request)
    if not valid_key:
        return {}, 404
    # do a self join to return the responses
    messages = query_db('''select u1.name as name, a.id as id, a.body as body, u2.name as reply_name, b.id as reply_id, b.body as reply_body from messages a
        left join messages b on a.id = b.reply_to
        left join users u1 on a.user_id = u1.id
        left join users u2 on b.user_id = u2.id
        where a.id = ? and a.reply_to is null''', [message_id])
    if messages is None:
        return {}, 200
        
    all_messages = []
    messages_dict = {}
    for message in messages:
        if message['id'] not in messages_dict.keys():
            messages_dict[message['id']] = {
            'id': message['id'],
            'user_name': message['name'], 
            'body': message['body'],
            'replies': []
            }
        if message['reply_id'] is not None:
            messages_dict[message['id']]['replies'].append(
                {
                    'reply_id': message['reply_id'], 
                    'reply_user_name': message['reply_name'],
                    'body': message['reply_body'],
                }
            )
    all_messages = list(messages_dict.values())
    return jsonify(all_messages), 200
