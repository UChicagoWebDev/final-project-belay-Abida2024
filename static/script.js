// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

/* Global variables I've added to keep track of the 
current room, whether the user is logged in or not, 
whether they've failed at loggin in, and a next page to direct to*/
let CURRENT_ROOM = 0;
let LOGGED_IN = false;
let LOGIN_FAILURE = false;
let NEXT_PAGE = "/";

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

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

// ------------------ ROUTER ---------------------
let router = () => {
  let path = window.location.pathname;
  // Stop polling whenever the pathname changes;
  CURRENT_ROOM = 0;
  // grab the users credentials
  let apiKey = localStorage.getItem("api-key");
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
  } else if (path.includes("/room") && apiKey == null) {
    // redirect to the room after login
    NEXT_PAGE = path;
    history.pushState({}, "", "/login");
    router();
  } else if (path.includes("/room")) {
    // start polling for that room
    let room_id = path.split("/").pop();
    CURRENT_ROOM = room_id;
    displayRoom(path, room_id);
    showOnly("room");
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
      "API-Key": localStorage.getItem("api-key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      let userProfile = document.querySelectorAll(".userProfile");
      userProfile.forEach((user) => (user.innerHTML = data["name"]));
    });
};

let showOnly = (className) => {
  let pages = [SPLASH, PROFILE, LOGIN, ROOM];
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

/* Helper function to display the rooms on the home page*/
let displayIndexRooms = () => {
  let url = "/api/rooms/all";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("api-key"),
    },
  })
    .then((response) => response.json())
    .then((data) => insertRooms(data));
};

/* Helper function to insert the room onto the home page*/
let insertRooms = (rooms) => {
  // First clear the rooms
  let noRooms = document.querySelector(".rooms .noRooms");
  noRooms.classList.add("hide");
  if (rooms.length == 0) {
    noRooms.classList.remove("hide");
    return;
  }
  let roomslist_div = document.querySelector(".roomList");
  roomslist_div.replaceChildren();
  // Insert the remaining rooms
  rooms.forEach((room) => {
    let room_div = document.createElement("a");
    room_div.href = `/room/${room["room_id"]}`;
    room.textContent = `${room["room_id"]}: `;
    let strong = document.createElement("strong");
    strong.textContent = room["name"];
    room_div.appendChild(strong);
    roomslist_div.appendChild(room_div);
  });
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
  // Create a room
  document
    .querySelector(".hero button.create")
    .addEventListener("click", () => {
      createRoom();
    });
};

let index = () => {
  // Logged in users
  if (LOGGED_IN) {
    displayIndexRooms();
    SPLASH.querySelector(".loggedIn").classList.remove("hide");
    SPLASH.querySelector(".loggedOut").classList.add("hide");
    SPLASH.querySelector("button.signup").classList.add("hide");
    SPLASH.querySelector(".rooms").classList.remove("hide");
  } else {
    SPLASH.querySelector(".loggedIn").classList.add("hide");
    SPLASH.querySelector(".loggedOut").classList.remove("hide");
    SPLASH.querySelector("button.create").classList.add("hide");
    SPLASH.querySelector(".rooms").classList.add("hide");
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
        console.log("here");
        LOGIN_FAILURE = true;
        history.pushState({}, "", "/login");
        router();
      } else {
        localStorage.setItem("api-key", data["api-key"]);
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
  localStorage.removeItem("api-key");
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
      "API-Key": localStorage.getItem("api-key"),
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
      "API-Key": localStorage.getItem("api-key"),
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
  PROFILE.querySelector(".header h4").addEventListener("click", () => {
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
      "API-Key": localStorage.getItem("api-key"),
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
      localStorage.setItem("api-key", data["api-key"]);
      history.pushState({}, "", "/profile");
      router();
    });
};

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)

// ------------------ ROOM PAGE  ---------------------
let roomListeners = () => {
  setInterval(() => {
    if (CURRENT_ROOM == 0) return;
    else {
      getMessages();
    }
  }, 500);
  // Post messages
  let button = document.querySelector(".comment_box button");
  button.addEventListener("click", postMessage);
  // Room edit
  let room_name = document.querySelector(".roomDetail .displayRoomName a");
  room_name.addEventListener("click", roomEditShow);
  let room_name_input = document.querySelector(
    ".roomDetail .editRoomName button"
  );
  room_name_input.addEventListener("click", editRoomname);
};

// ------------------ ROOM PAGE: GETTING AND POSTING MESSAGES ---------------------
let postMessage = (event) => {
  event.preventDefault();
  let postContent = document.querySelector("textarea").value;
  let room_id = document.URL.split("/").pop();
  let url = "/api/post_messages";
  let data = {
    roomid: room_id,
    postbody: postContent,
  };
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("api-key"),
    },
    body: JSON.stringify(data),
  }).then((response) => console.log(response.status));
};

let getMessages = () => {
  let room_id = window.location.pathname.split("/").pop();
  const url = `/api/retrieve_messages/${room_id}`;
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("api-key"),
    },
  })
    .then((response) => response.json())
    .then((data) => insertMessages(data));
};

function insertMessages(messages) {
  let messages_div = document.body.querySelector(".messages");
  // Clear the old messages!!
  // NOTE: Is there a better way to only grab new messages?
  messages_div.replaceChildren();
  if (Object.keys(messages).length == 0) {
    return;
  }
  messages.map((message) => {
    let msg = document.createElement("message");
    let author = document.createElement("author");
    author.textContent = message["user_id"];
    let content = document.createElement("content");
    content.textContent = message["body"];
    msg.appendChild(author);
    msg.appendChild(content);
    // Append to the messages class
    messages_div.appendChild(msg);
  });
}

// ------------------ CREATING AND DISPLAYING A ROOM ---------------------
let createRoom = () => {
  const url = "/api/rooms/new";
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": localStorage.getItem("api-key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Add the room to the index page
      history.pushState({}, "", `/room/${data["room_id"]}`);
      router();
    });
};

let displayRoom = (path, room_id) => {
  // Clear all the messages in the chat
  let messages_div = document.body.querySelector(".messages");
  messages_div.replaceChildren();

  // Set up the rest of the room display
  let room_name = document.querySelector(".displayRoomName h3 strong");
  let invite = document.querySelector(".roomDetail a#invite");
  const url = `/api/rooms/${room_id}`;
  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": localStorage.getItem("api-key"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      room_name.textContent = data["name"];
      invite.href = `/room/${data["room_id"]}`;
      invite.textContent = `/room/${data["room_id"]}`;
    });
  roomEditHide();
};

// ------------------ ROOM NAME CHANGE ---------------------
let editRoomname = () => {
  let url = "/api/room/namechange";
  let room_id = document.URL.split("/").pop();
  let room_name = document.querySelector(
    ".roomDetail .editRoomName input"
  ).value;
  let data = {
    room_id: room_id,
    room_name: room_name,
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": localStorage.getItem("api-key"),
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      let span = document.querySelector(
        ".roomDetail .displayRoomName h3 strong"
      );
      span.textContent = data["room_name"];
    })
    .then(() => roomEditHide());
};

let roomEditShow = () => {
  let edit_panel = document.querySelector(".roomDetail .displayRoomName");
  edit_panel.classList.add("hide");

  let room_name = document.querySelector(".roomDetail .editRoomName");
  room_name.classList.remove("hide");
};

let roomEditHide = () => {
  let edit_panel = document.querySelector(".roomDetail .displayRoomName");
  edit_panel.classList.remove("hide");

  let room_name = document.querySelector(".roomDetail .editRoomName");
  room_name.classList.add("hide");
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
  let splashSmall = document.querySelectorAll(".header h4");
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
  roomListeners();
};

window.addEventListener("DOMContentLoaded", eventListeners);
window.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", () => {
  router();
});
