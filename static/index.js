// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const channel = document.querySelector(".channel");

/* Global variables I've added to keep track of the 
current channel, whether the user is logged in or not, 
whether they've failed at loggin in, and a next page to direct to*/
let CURRENT_CHANNEL = 0;
let LOGGED_IN = false;
let LOGIN_FAILURE = false;
let NEXT_PAGE = "/";
let REPLY_PANE = false;

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(
  ".profile input[name=repeatPassword]"
);
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if (passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
};

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

// ------------------ ROUTER ---------------------
let router = () => {
  let path = window.location.pathname;
  // Stop polling whenever the pathname changes;
  CURRENT_CHANNEL = 0;
  // grab the users credentials
  let apiKey = localStorage.getItem("abida_belay_auth_key");
  if (apiKey != null) {
    LOGGED_IN = true;
    grabUser(); // populates the {{ username }} on the DOM
  }
  // routers
  if (path == "/") {
    index(); // Signed in vs Signed Out
    showOnly("splash");
  } else if (path == "/login" && apiKey == null) {
    login();
    showOnly("login");
  } else if (path == "/login") {
    LOGGED_IN = true;
    // have credentials, send them to the home page
    history.pushState({}, "", "/");
    router();
  } else if (path == "/profile" && apiKey == null) {
    // redirect to profile after login
    NEXT_PAGE = "/profile";
    history.pushState({}, "", "/login");
    router();
  } else if (path == "/profile") {
    profile();
    showOnly("profile");
  } else if (path.includes("/channel") && apiKey == null) {
    // redirect to the channel after login
    NEXT_PAGE = path;
    history.pushState({}, "", "/login");
    router();
  } else if (path.includes("/channel")) {
    // start polling for that channel
    let channel_id = path.split("/")[2];
    CURRENT_CHANNEL = channel_id;
    if (path.includes("reply")) {
      REPLY_PANE = true;
      displayReplyPane();
    } else {
      REPLY_PANE = false;
    }
    showOnly("channel");
  } else if (path == "/logout") {
    logout();
    history.pushState({}, "", "/");
    router();
  } else {
    console.log("I don't recognize that page!");
  }
};

// ------------------ HELPER FUNCTIONS FOR ROUTER ---------------------

/* Populating the {{ username }} fields on the DOM */
let grabUser = () => {
  let url = "/api/user/key";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      let userProfile = document.querySelectorAll(".userProfile");
      userProfile.forEach((user) => (user.innerHTML = data["name"]));
    });
};

let showOnly = (className) => {
  let pages = [SPLASH, PROFILE, LOGIN, channel];
  for (i = 0; i < pages.length; i++) {
    let page = pages[i];
    if (page.className.includes(className)) {
      page.classList.remove("hide");
      continue;
    }
    page.classList.add("hide");
  }
};

// ------------------ HOME/SPLASH PAGE HELPER FUNCTIONS ---------------------

/* Helper function to display the channels on the home page*/
let displayIndexchannels = () => {
  let url = "/api/channels/list";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => listChannels(data, ".channelList"));
};

// ------------------ HOME/SPLASH PAGE ---------------------
let splashListeners = () => {
  // Login
  document.querySelector(".loggedOut a").addEventListener("click", () => {
    history.pushState({}, "", "/login");
    router();
  });
  // Sign-up
  document
    .querySelector(".hero button.signup")
    .addEventListener("click", () => {
      signup();
    });
  // Create a channel
  document
    .querySelector(".hero button.create")
    .addEventListener("click", () => {
      createchannel();
    });
};

let index = () => {
  // Logged in users
  if (LOGGED_IN) {
    displayIndexchannels();
    SPLASH.querySelector(".loggedIn").classList.remove("hide");
    SPLASH.querySelector(".loggedOut").classList.add("hide");
    SPLASH.querySelector("button.signup").classList.add("hide");
    SPLASH.querySelector(".channels").classList.remove("hide");
  } else {
    SPLASH.querySelector(".loggedIn").classList.add("hide");
    SPLASH.querySelector(".loggedOut").classList.remove("hide");
    SPLASH.querySelector("button.create").classList.add("hide");
    SPLASH.querySelector(".channels").classList.add("hide");
  }
};

// ------------------ LOGIN PAGE ---------------------
let login = () => {
  if (LOGIN_FAILURE) {
    document.querySelector(".failed .message").classList.remove("hide");
    document.querySelector(".failed button").classList.remove("hide");
  } else {
    document.querySelector(".failed .message").classList.add("hide");
    document.querySelector(".failed button").classList.add("hide");
  }
};

let apiLogin = () => {
  // Redirect to the next page upon success,
  //  else return to the same page with the error message
  let url = "/api/login";
  let username = document.querySelector(
    ".alignedForm.login input[name=username]"
  ).value;
  let password = document.querySelector(
    ".alignedForm.login input[name=password]"
  ).value;
  let data = {
    username: username,
    password: password,
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
      if (Object.keys(data).length === 0) {
        LOGIN_FAILURE = true;
        history.pushState({}, "", "/login");
        router();
      } else {
        localStorage.setItem("abida_belay_auth_key", data["api-key"]);
        LOGGED_IN = true;
        LOGIN_FAILURE = false;
        history.pushState({}, "", NEXT_PAGE);
        router();
      }
    });
};

let loginListeners = () => {
  // Login
  document
    .querySelector(".alignedForm.login button")
    .addEventListener("click", apiLogin);
  document.querySelector(".failed button").addEventListener("click", () => {
    signup();
    history.pushState({}, "", "/profile");
    router();
  });
};

// ------------------ LOGOUT ---------------------
let logout = () => {
  LOGGED_IN = false;
  localStorage.removeItem("abida_belay_auth_key");
  history.pushState({}, "", "/");
  router();
};

// ------------------ PROFILE PAGE HELPERS TO UPDATE USERPASS ---------------------
let updateUsername = () => {
  let update_username = document.querySelector("input[name=username]").value;
  let url = "/api/user/changename";
  let data = {
    username: update_username,
  };
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
    body: JSON.stringify(data),
  }).then((response) => console.log(response.status));
};

let updatePassword = () => {
  let update_password = document.querySelector("input[name=password]").value;
  let url = "/api/user/changepassword";
  let data = {
    password: update_password,
  };
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
    body: JSON.stringify(data),
  }).then((response) => console.log(response.status));
};

// ------------------ PROFILE PAGE ---------------------

let profileListeners = () => {
  document
    .querySelector(".alignedForm button[name=username]")
    .addEventListener("click", updateUsername);

  document
    .querySelector(".alignedForm button[name=password]")
    .addEventListener("click", updatePassword);

  document.querySelector(".exit.logout").addEventListener("click", logout);
  document.querySelector(".exit.goToSplash").addEventListener("click", () => {
    history.pushState({}, "", "/");
    router();
  });

  PROFILE.querySelector(".header h2").addEventListener("click", () => {
    history.pushState({}, "", "/");
    router();
  });
};

let profile = () => {
  let url = "/api/user/key";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      let username = PROFILE.querySelector(".alignedForm input[name=username]");
      username.value = data["name"];
      let password = PROFILE.querySelector(".alignedForm input[name=password]");
      password.value = data["password"];
      let repeatPassword = PROFILE.querySelector(
        ".alignedForm input[name=repeatPassword]"
      );
      repeatPassword.value = data["password"];
      // Upper right hand corner
      PROFILE.querySelector(".welcomeBack .username").textContent =
        data["name"];
    });
};

// ----- SIGNUP LOGIC -----
let signup = () => {
  // Make a call to signup and set the name and password
  const url = "/api/signup";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Set the session storage and redirect to the profile
      localStorage.setItem("abida_belay_auth_key", data["api-key"]);
      history.pushState({}, "", "/profile");
      router();
    });
};

// ------------------ channel PAGE  ---------------------
let channelListeners = () => {
  setInterval(() => {
    if (CURRENT_CHANNEL == 0 || !LOGGED_IN) return;
    else {
      getMessages();
    }
  }, 500);
  setInterval(() => {
    if (!LOGGED_IN) return;
    else {
      getChannelUnread();
    }
  }, 1000);
  // Make sure the reply pane is kept update as well
  setInterval(() => {
    if (!REPLY_PANE) return;
    else {
      displayReplyPane();
    }
  }, 500);
  // Post messages
  let button = document.querySelector(".comment_box button");
  button.addEventListener("click", postMessage);
  let reply_button = document.querySelector(".replyPane .comment_box");
  reply_button.addEventListener("click", (event) => {
    const message_id = location.pathname.split("/")[4];
    postMessage(event, message_id);
  });
  // Close and open the reply pane
  let replyPane = document.querySelector(".replyPane");
  let replyPaneClose = document.querySelector(".replyPane span#close");
  replyPaneClose.addEventListener("click", () => {
    replyPane.classList.add("hide");
    const url = location.pathname.split("/").slice(0, 3).join("/");
    history.pushState({}, "", url);
    router();
  });
};

// ------------------ channel PAGE: Get Unread messages per channel ---------------------
let getChannelUnread = () => {
  let url = "/api/channels/list";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => listChannels(data));
};

let listChannels = (channels, channelClass = ".clip .channelList") => {
  console.log(channelClass);
  let channelslist_div = document.querySelector(channelClass);
  console.log(CURRENT_CHANNEL);
  channelslist_div.replaceChildren();
  // Insert the remaining channels
  channels.forEach((channel) => {
    let channel_div = document.createElement("a");
    if (CURRENT_CHANNEL == channel["channel_id"]) {
      channel_div.classList.add("highlight");
    }
    channel_div.href = `/channel/${channel["channel_id"]}`;
    channel.textContent = `${channel["channel_id"]}: `;
    let strong = document.createElement("strong");
    strong.textContent = "#" + channel["channel_name"];
    let unreadMessages = document.createElement("strong");
    unreadMessages.textContent = " | Unread: " + channel["unread_messages"];
    channel_div.appendChild(strong);
    channel_div.appendChild(unreadMessages);
    channelslist_div.appendChild(channel_div);
  });
};

// ------------------ channel PAGE: GETTING AND POSTING MESSAGES ---------------------
let postMessage = (event, reply_to = null) => {
  event.preventDefault();
  let input_class = reply_to ? ".replyPane .comment_box textarea" : "textarea";
  let postContent = document.querySelector(input_class).value;
  let channel_id = location.pathname.split("/")[2];
  let url = "/api/channels/postmessage";
  let data = {
    channel_id: channel_id,
    body: postContent,
    reply_to: reply_to,
  };
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
    body: JSON.stringify(data),
  }).then((response) => console.log(response.status));
};

let getMessages = () => {
  let channel_id = window.location.pathname.split("/")[2];
  const url = `/api/channels/getmessages/${channel_id}`;
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => insertMessages(data));
};

function displayReplyPane() {
  let reply_pane = document.body.querySelector(".replyPane");
  reply_pane.classList.remove("hide");
  let message_id = location.pathname.split("/")[4];
  let url = `/api/channels/getmessagereplies/${message_id}`;
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      data = data[0];
      let parent_msg = reply_pane.querySelector(".messages.parent");
      parent_msg.replaceChildren();
      parent_msg.id = data["id"];
      let author = document.createElement("author");
      author.textContent = data["user_name"];
      let content = document.createElement("content");
      content.textContent = data["body"];
      parent_msg.appendChild(author);
      parent_msg.appendChild(content);
      reply_pane.appendChild(parent_msg);
      let reply_messages = reply_pane.querySelector(".messages.replies");
      reply_messages.replaceChildren();
      // Add the replies if they exist
      if (Object.keys(data["replies"]).length == 0) {
        return;
      }
      data["replies"].map((reply) => {
        let reply_msg = document.createElement("message");
        reply_msg.id = reply["reply_id"];
        let reply_author = document.createElement("author");
        reply_author.textContent = reply["reply_name"];
        let reply_content = document.createElement("content");
        reply_content.textContent = reply["reply_body"];
        reply_msg.appendChild(reply_author);
        reply_msg.appendChild(reply_content);
        console.log(reply_msg);
        reply_messages.appendChild(reply_msg);
      });
    });
}

function insertMessages(messages) {
  const channel_id = location.pathname.split("/")[2];
  let messages_div = document.body.querySelector(".messages");
  // Clear the old messages!!
  // NOTE: Is there a better way to only grab new messages?
  messages_div.replaceChildren();
  if (Object.keys(messages).length == 0) {
    return;
  }
  messages.map((message) => {
    let msg = document.createElement("message");
    msg.id = message["id"];
    let author = document.createElement("author");
    author.textContent = message["user_name"];
    let content = document.createElement("content");
    content.textContent = message["body"];
    let replyIcon = document.createElement("i");
    replyIcon.className = "fas fa-cloud";
    replyIcon.textContent = "Reply";
    replyIcon.addEventListener("click", () => {
      history.pushState({}, "", `/channel/${channel_id}/reply/${msg.id}`);
      router();
    });
    let numReplies = document.createElement("numReplies");
    numReplies.textContent = `Replies: ${message["replies"].length}`;
    msg.appendChild(author);
    msg.appendChild(content);
    msg.appendChild(numReplies);
    msg.appendChild(replyIcon);
    messages_div.appendChild(msg);
  });
}

// ------------------ CREATING AND DISPLAYING A channel ---------------------
let createchannel = () => {
  const url = "/api/channels/new";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": localStorage.getItem("abida_belay_auth_key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Add the channel to the index page
      history.pushState({}, "", `/channel/${data["channel_id"]}`);
      router();
    });
};

//  ------------------  HEADER LISTENERS ---------------------
let headerListeners = () => {
  // Navigate to the home page from all the watch party links
  let splashLarge = document.querySelectorAll(".header h2");
  splashLarge.forEach((header) => {
    header.addEventListener("click", () => {
      history.pushState({}, "", "/");
      router();
    });
  });
  // Link to the profile for all the usernames
  let welcomeBack = document.querySelectorAll(".welcomeBack");
  welcomeBack.forEach((user) => {
    user.addEventListener("click", () => {
      history.pushState({}, "", "/profile");
      router();
    });
  });
};

//  ------------------ PAGE LOAD ---------------------
let eventListeners = () => {
  headerListeners();
  splashListeners();
  loginListeners();
  profileListeners();
  channelListeners();
};

window.addEventListener("DOMContentLoaded", eventListeners);
window.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", () => {
  router();
});
