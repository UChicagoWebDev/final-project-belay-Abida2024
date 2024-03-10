const CreateChannel = ({ loggedIn, nextPageHandler }) => {
  const history = ReactRouterDOM.useHistory();
  if (!loggedIn | (loggedIn == "false")) {
    nextPageHandler("/create_channel"); // update this to the path maybe
    return history.push("/login");
  }

  const createChannelHandler = (event) => {
    event.preventDefault();
    const url = "/api/channels/new";
    const data = {
      channel_name: event.target.channelname.value,
    };
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": localStorage.getItem("abida_belay_auth_key"),
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) =>
        history.push("/channel?channel_name=" + data["channel_id"])
      );
  };

  return (
    <form onSubmit={createChannelHandler}>
      <label>
        New Channel Name:
        <input type="text" name="channelname" />
      </label>
      <input type="submit" value="Create New Channel" />
    </form>
  );
};

// Get the messages for the channel
const getChannelMessages = (
  channel_id,
  channelMessages,
  setChannelMessages
) => {
  const url = `/api/channnels/getmessages/${channel_id}`;
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => setChannelMessages(data));
};

const getUnreadMessagesPerChannel = (setMessages) => {
  const url = "/api/channels/list";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      setMessages(data);
    });
};

// populate all the channels + the number of unread messages for all
// poll every 5 seconds ?
const ListChannels = (messages) => {
  const history = ReactRouterDOM.useHistory();
  if (Object.keys(messages["messages"]).length === 0) {
    return;
  }
  return (
    <ul className="channel">
      {messages["messages"].map((message) => {
        return (
          <li>
            <a href={`/channel/${message["channel_id"]}`}>
              {" "}
              {message["channel_name"]}{" "}
            </a>
            , Unread Messages:
            {message["unread_messages"]}
          </li>
        );
      })}
    </ul>
  );
};

const ChannelMessages = ({ messages }) => {
  console.log(messages);
  if (Object.keys(messages).length === 0) {
    return;
  }

  console.log("here!");

  return (
    <ul className="channel">
      {messages.map((message) => {
        return (
          <li>
            {message["user_id"]} {message["body"]}
          </li>
        );
      })}
    </ul>
  );
};

const Channel = ({ username, loggedIn, nextPageHandler }) => {
  const history = ReactRouterDOM.useHistory();
  const location = ReactRouterDOM.useLocation();
  const [messages, setMessages] = React.useState({});
  const [channelMessages, setChannelMessages] = React.useState({});
  const [replyPane, setReplyPane] = React.useState(false);
  // Redirect to signup/login page if the user is not signed in
  if (!loggedIn) {
    nextPageHandler("/channel"); // update this to the path maybe
    return history.push("/login");
  }
  let channel_id = 0;
  let reply_id = 0;
  const curchannel = location.pathname.split("/");
  // Update the current channel id
  if (curchannel.length > 2) {
    channel_id = curchannel[2];
  }
  if (curchannel.includes("reply")) {
    reply_id = curchannel[4];
  }

  const postChannelMessage = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const url = "/api/channels/postmessage";
      const data = {
        channel_id: channel_id,
        body: event.target.value,
        reply_to: null,
      };
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API-Key": localStorage.getItem("abida_belay_auth_key"),
        },
        body: JSON.stringify(data),
      }).then((response) => console.log(response.status));
    }
  };

  // Poll for the channel list every few seconds
  // setInterval(() => {
  //   getUnreadMessagesPerChannel(setMessages);
  // }, 5000);

  setInterval(() => {
    if (channel_id == 0) return;
    else {
      getChannelMessages(channel_id, channelMessages, setChannelMessages);
    }
  }, 5000);

  return (
    <>
      {/* <ListChannels messages={messages} /> */}
      <ChannelMessages messages={channelMessages} />
      <form>
        <input
          type="text"
          onKeyDown={() => {
            postChannelMessage(event, channel_id);
          }}
          placeholder="message #web-development"
        />
      </form>
    </>
  );
};

// SIGNUP
const Signup = ({ handleUsername, loggedIn, handleLogin }) => {
  const history = ReactRouterDOM.useHistory();
  const [signupFailure, setSignupFailure] = React.useState(false);
  // https://legacy.reactjs.org/docs/forms.html
  const handleSignup = (event) => {
    event.preventDefault();
    let url = "/api/signup";
    let data = {
      username: event.target.username.value,
      password: event.target.password.value,
    };
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        // Set the local storage
        localStorage.setItem("abida_belay_auth_key", data["api-key"]);
        setSignupFailure(false);
        handleUsername(data["username"]);
        handleLogin(true);
        history.push("/");
      })
      .catch((error) => {
        setSignupFailure(true);
      });
  };
  return (
    <>
      {loggedIn ? (
        history.push("/")
      ) : (
        <>
          <h1>Create a new Belay account below!</h1>
          <form onSubmit={handleSignup}>
            <label>
              New Username:
              <input type="text" name="username" />
            </label>
            <label>
              New Password:
              <input type="text" name="password" />
            </label>
            <input type="submit" value="Signup" />
          </form>
          <div>
            {signupFailure && <div>Whoops, that username is taken!</div>}
          </div>
        </>
      )}
    </>
  );
};

// LOGIN
const Login = ({ handleUsername, loggedIn, handleLogin, nextPage }) => {
  // Think about how to handle being logged in vs out
  const history = ReactRouterDOM.useHistory();
  const [loginFailure, setLoginFailure] = React.useState(false);
  // https://legacy.reactjs.org/docs/forms.html
  const loginHandler = (event) => {
    event.preventDefault();
    let url = "/api/login";
    let data = {
      username: event.target.username.value,
      password: event.target.password.value,
    };
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        // Failure
        if (Object.keys(data).length === 0) {
          setLoginFailure(true);
        } else {
          // set the local storage
          localStorage.setItem("abida_belay_auth_key", data["api-key"]);
          // NOTE: Is this necessary
          setLoginFailure(false);
          handleLogin(true);
          handleUsername(event.target.username.value);
          console.log("PUSHING TO THE NEXT PAGE", nextPage);
          history.push(nextPage);
        }
      });
  };

  return (
    <>
      {loggedIn ? (
        history.push("/")
      ) : (
        <>
          <form onSubmit={loginHandler}>
            <label>
              Username:
              <input type="text" name="username" />
            </label>
            <label>
              Password:
              <input type="text" name="password" />
            </label>
            <input type="submit" value="Log In" />
          </form>
          <div>
            {loginFailure && <div>Incorrect username or password!</div>}
          </div>
        </>
      )}
    </>
  );
};

const Logout = ({ handleUsername, loggedIn, handleLogin }) => {
  const history = ReactRouterDOM.useHistory();
  const handleLogout = () => {
    handleUsername("");
    handleLogin(false);
    localStorage.removeItem("abida_belay_auth_key");
    localStorage.removeItem("abida_belay_auth-key");
    history.push("/");
  };
  // Logout button
  return (
    <>
      {loggedIn ? (
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      ) : null}
    </>
  );
};

// Profile with the username and password change
// NOTE: Take it in as a password variable?
const Profile = ({ username, handleUsername, loggedIn, nextPageHandler }) => {
  // NOTE: Function scope
  const history = ReactRouterDOM.useHistory();

  // If not logged in set to the login page and set the next page to profile
  if (!loggedIn) {
    nextPageHandler("/profile");
    return history.push("/login");
  }

  const [password, setPassword] = React.useState("");
  // set the password using the
  const url = "/api/user/password";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => setPassword(data["password"]));
  // Update username
  const handleUsernameChange = (event) => {
    event.preventDefault();
    let url = "/api/user/changename";
    let data = {
      username: event.target.username.value,
    };
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": localStorage.getItem("abida_belay_auth_key"),
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => handleUsername(data["username"]));
  };
  // Update password
  const handlePasswordChange = (event) => {
    event.preventDefault();
    let url = "/api/user/changepassword";
    let data = {
      password: event.target.password.value,
    };
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-KEY": localStorage.getItem("abida_belay_auth_key"),
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => setPassword(data["password"]));
  };
  return (
    <>
      <h1>User Profile</h1>
      <form onSubmit={handleUsernameChange}>
        <label>
          New Username:
          <input type="text" name="username" defaultValue={username} />
        </label>
        <input type="submit" value="Change Username" />
      </form>
      <form onSubmit={handlePasswordChange}>
        <label>
          New Password:
          <input type="text" name="password" defaultValue={password} />
        </label>
        <input type="submit" value="Change Password" />
      </form>
    </>
  );
};

const Home = ({ username, loggedIn }) => {
  return (
    <>
      <h1> Welcome to Belay! </h1>
    </>
  );
};

const Belay = () => {
  // NOTE: Alternatively, you can use window.ReactRouterDOM.{};
  const HashRouter = ReactRouterDOM.HashRouter;
  const Link = ReactRouterDOM.Link;
  const Route = ReactRouterDOM.Route;
  // Look at the session storage
  const [username, setUsername] = React.useState(
    sessionStorage.getItem("abida_belay_username")
  );
  const handleUsername = (value) => {
    setUsername(value);
    sessionStorage.setItem("abida_belay_username", value);
  };
  // State of being logged in vs out
  const [loggedIn, setLoggedIn] = React.useState(
    sessionStorage.getItem("abida_belay_logged_in")
  );
  const handleLogin = (value) => {
    setLoggedIn(value);
    sessionStorage.setItem("abida_belay_logged_in", value);
  };
  // Redirect/next page -> do I have to use session storage for this
  const [nextPage, setNextPage] = React.useState("/");
  const nextPageHandler = (value) => {
    setNextPage(value);
  };

  return (
    <HashRouter>
      <nav className="mainHeader">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          {loggedIn ? null : (
            <li>
              <Link to="/signup">Signup</Link>
            </li>
          )}
          {loggedIn ? (
            <li>
              <Link to="/logout">Logout</Link>
            </li>
          ) : (
            <li>
              <Link to="/login">Login</Link>
            </li>
          )}
          {loggedIn ? (
            <li>
              <Link to="/profile">Profile</Link>
            </li>
          ) : null}
          {loggedIn ? (
            <li>
              <Link to="/channel">Channels</Link>
            </li>
          ) : null}
          {loggedIn ? (
            <li>
              <Link to="/createchannel">Create New Channel</Link>
            </li>
          ) : null}
        </ul>
      </nav>
      <Route exact path="/">
        <Home username={username} loggedIn={loggedIn} />
      </Route>
      <Route exact path="/signup">
        <Signup
          handleUsername={handleUsername}
          loggedIn={loggedIn}
          handleLogin={handleLogin}
        />
      </Route>
      <Route exact path="/logout">
        <Logout
          handleUsername={handleUsername}
          loggedIn={loggedIn}
          handleLogin={handleLogin}
        />
      </Route>
      <Route exact path="/login">
        <Login
          handleUsername={handleUsername}
          loggedIn={loggedIn}
          handleLogin={handleLogin}
          nextPage={nextPage}
        />
      </Route>
      <Route path="/profile">
        <Profile
          username={username}
          handleUsername={handleUsername}
          loggedIn={loggedIn}
          nextPageHandler={nextPageHandler}
        />
      </Route>
      <Route path="/createchannel">
        <CreateChannel
          username={username}
          loggedIn={loggedIn}
          nextPageHandler={nextPageHandler}
        />
      </Route>
      <Route path="/channel">
        <Channel
          username={username}
          loggedIn={loggedIn}
          nextPageHandler={nextPageHandler}
        />
      </Route>
    </HashRouter>
  );
};

// RENDER
const rootContainer = document.getElementById("root");
const root = ReactDOM.createRoot(rootContainer);
root.render(<Belay />);
