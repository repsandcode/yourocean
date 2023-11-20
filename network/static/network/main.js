document.addEventListener("DOMContentLoaded", function () {
  document
    .querySelector("#logo")
    .addEventListener("click", () => view_posts("all"));

  document
    .querySelector("#all-posts")
    .addEventListener("click", () => view_posts("all"));

  document
    .querySelector("#following")
    .addEventListener("click", () => view_posts("following"));

  document.querySelector("#username").addEventListener("click", view_profile);

  view_posts("all");
});

function view_posts(view, page_num = 1) {
  document.querySelector("#user-profile").style.display = "none";
  document.querySelector("#post-form").style.display = "block";
  document.querySelector("#post-form").onsubmit = create_post;

  // Adjust the height of the textarea based on its content
  document
    .querySelector("#post-content")
    .addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });

  fetch_posts(view, page_num);
}

function view_profile() {
  document.querySelector("#post-form").style.display = "none";

  let username = this.innerHTML;

  if (username === "Profile") {
    username = this.dataset.username;
  }

  fetch_profile(username);
}

function fetch_posts(view, page_num) {
  try {
    fetch(`/${view}/?page=${page_num}`)
      .then((response) => {
        if (response.ok) {
          console.log(`Retrieved ${view} posts`);
        } else {
          console.log(`Cannot retrieve ${view} posts`);
        }
        return response.json();
      })
      .then((page) => {
        console.log(page);
        // update POSTS
        show_posts(page.posts);

        show_pagination(page, view);
      })
      .catch((error) => {
        // Handle network errors or exceptions here
        console.log("Error:", error);
      });
  } catch (error) {
    console.log("Error fetching data: ", error);
  }
}

function fetch_profile(username) {
  const user_profile = document.querySelector("#user-profile");
  user_profile.style.display = "block";

  if (user_profile.childElementCount > 0) {
    while (user_profile.firstChild) {
      user_profile.removeChild(user_profile.firstChild);
    }
  }

  fetch(`/${username}`)
    .then((response) => {
      if (response.ok) {
        console.log(`Got ${username} profile`);
      } else {
        console.log(`Cannot get ${username} profile`);
      }
      return response.json();
    })
    .then((profile) => {
      console.log(profile);

      // user info
      const user_info = document.createElement("div");
      user_info.classList.add("mb-5");

      user_info.innerHTML = `
      <div class="d-flex justify-content-between mb-4">
        <div class="d-flex">
          <button class="fs-4 border-0 bg-transparent p-0"><i class="fa-solid fa-arrow-left cursor-pointer" id="go-back"></i></button>
          <h1 class="mb-0 ms-4 fs-2 align-self-center">${
            profile[0].username
          }</h1>
        </div>
        <div class="align-items-center">${
          profile[0].not_me
            ? profile[0].is_following
              ? '<button class="btn btn-primary px-3 fs-5" id="unfollow">Unfollow</button>'
              : '<button class="btn btn-primary px-3 fs-5" id="follow">Follow</button>'
            : ""
        }
        </div>
      </div>
      <div class="d-flex mb-5 gap-3">
        <p class="fs-4"><span class="fw-semibold">${
          profile[0].following
        }</span> Following</p>
        <p class="fs-4"><span class="fw-semibold">${
          profile[0].followers
        }</span> Followers</p>
      </div>`;

      user_profile.append(user_info);

      show_posts(profile[1]["posts"]);

      show_pagination(profile[1], username);
    })
    .then(() => {
      try {
        document
          .querySelector("#go-back")
          .addEventListener("click", () => view_posts("all"));

        const follow = document.querySelector("#follow");
        const unfollow = document.querySelector("#unfollow");

        if (follow) {
          follow.addEventListener("click", () => set_follow(username));
        }
        if (unfollow) {
          unfollow.addEventListener("click", () => set_unfollow(username));
        }
      } catch (error) {
        console.error(error);
      }
    })
    .catch((error) => {
      // Handle network errors or exceptions here
      console.log("Error:", error);
    });
}

function requests_to_post() {
  const all_usernames = document.querySelectorAll(".username");
  const posts_to_edit = document.querySelectorAll(".edit");
  const all_hearts = document.querySelectorAll(".fa-heart");

  Array.from(all_usernames).forEach((username) => {
    username.addEventListener("click", view_profile);
  });

  Array.from(posts_to_edit).forEach((post) => {
    post.addEventListener("click", edit_post);
  });

  Array.from(all_hearts).forEach((heart) => {
    heart.addEventListener("click", like_unlike_post);
  });
}

function requests_to_pagination(current_page, view) {
  const page_links = document.querySelectorAll(".page-link");

  Array.from(page_links).forEach((page) => {
    page.addEventListener("click", () => {
      if (page.ariaLabel === "Next") {
        view_posts(view, current_page + 1);
      } else if (page.ariaLabel === "Previous") {
        view_posts(view, current_page - 1);
      } else {
        view_posts(view, page.ariaLabel);
      }
      console.log(page.ariaLabel);
    });
  });
}

function show_posts(posts) {
  const post_view = document.querySelector("#posts");
  const username = document.querySelector("#username");

  console.log(username.innerHTML);

  while (post_view.firstChild) {
    post_view.removeChild(post_view.firstChild);
  }

  posts.forEach((post) => {
    const post_box = document.createElement("div");

    post_box.classList.add(
      "shadow",
      "p-4",
      "mb-5",
      "bg-body-tertiary",
      "rounded"
    );

    post_box.innerHTML = `
        <div class="d-flex justify-content-between mb-4">
            <!-- post's user details -->
            <h5 class="fs-4 username pointer">${post.user}</h5>
            <div class="fs-5">
              <span class="fs-5">${timeAgo(post.timestamp)}</span>
              ${
                username.innerHTML === post.user
                  ? '<span class="pointer edit"><i class="fa-regular fa-pen-to-square"></i></span>'
                  : ""
              }
            </div>
        </div>
        <div data-post-id="${post.id}">
            <!-- post's content -->
            <p class="fs-4 text-break">${post.content}</p>
        </div>
        <div class="post-status fs-4 ${
          post.user_liked_post ? "user-liked" : ""
        }">
          <span class="pointer">
            <i class="${
              post.user_liked_post ? "fa-solid" : "fa-regular"
            } fa-heart"></i> 
          </span>
          <span>${post.like_count}</span>            
        </div>`;

    post_view.append(post_box);
  });

  requests_to_post();
}

function show_pagination(page, view) {
  const pagination = document.querySelector("#pagination");

  while (pagination.firstChild) {
    pagination.removeChild(pagination.firstChild);
  }

  let pages = ``;

  for (let i = 1; i <= page.num_pages; i++) {
    pages += `
    <li class="page-item ${page.page_number === i ? "active" : ""} mx-1" ${
      page.page_number === i ? "aria-current='page'" : ""
    }">
      <a class="page-link pointer rounded fs-4 px-4 py-1" aria-label="${i}">${i}</a>
    </li>`;
  }

  const page_nav = document.createElement("nav");
  page_nav.setAttribute("aria-label", "page navigation");

  page_nav.innerHTML = `
    <ul class="pagination">
    ${
      page.has_previous
        ? `<li class="page-item me-4">
        <a class="page-link bg-transparent border-0" aria-label="Previous">
          <span class="fs-4 pointer"><i class="fa-solid fa-chevron-left"></i></span>
        </a>
      </li>`
        : ``
    }
    ${pages}
    ${
      page.has_next
        ? `<li class="page-item ms-4">
      <a class="page-link bg-transparent border-0" aria-label="Next">
        <span class="fs-4 pointer"><i class="fa-solid fa-chevron-right"></i></span>
      </a>
    </li>`
        : ``
    }
    </ul>`;

  pagination.append(page_nav);

  // function to get page
  requests_to_pagination(page.page_number, view);
}

function edit_post() {
  const edit_icon = this;
  const post_box = this.parentNode.parentNode.nextElementSibling;
  const post_id = post_box.dataset.postId;
  const post_content = post_box.children[0];
  const post_status = post_box.nextElementSibling;

  // remove icon when editing
  edit_icon.classList.toggle("d-none");

  // Create a "Save" button
  const button = document.createElement("button");
  // Create a textarea
  const textarea = document.createElement("textarea");

  button.innerText = "Save";
  button.classList.add("btn", "btn-info", "fs-5");

  textarea.value = post_content.innerText;
  textarea.classList.add("p-1", "fs-4", "w-100", "border-0", "post-content");
  // Adjust the height of the textarea based on its content
  textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  // Append the "Save" button
  post_status.replaceWith(button);

  // Replace the post content with the textarea
  post_content.replaceWith(textarea);
  textarea.focus();

  button.addEventListener("click", function () {
    // Update the post content with the textarea value
    post_content.innerText = textarea.value;
    // Remove the textarea and save button
    textarea.replaceWith(post_content);

    button.replaceWith(post_status);

    edit_icon.classList.toggle("d-none");

    update_post(post_id, "PUT", textarea.value);
  });
}

function like_unlike_post() {
  const heart_icon = this;
  const like_count = heart_icon.parentNode.nextElementSibling;
  const current_likes = Number(like_count.innerText);

  const post_status = heart_icon.parentNode.parentNode;
  const post_box = heart_icon.parentNode.parentNode.previousElementSibling;
  const post_id = post_box.dataset.postId;

  const is_liked = post_status.classList.contains("user-liked");
  const username = post_box.previousElementSibling.children[0].innerHTML;

  if (is_liked) {
    like_count.innerText = current_likes - 1;
    heart_icon.classList.toggle("fa-solid");
    heart_icon.classList.add("fa-regular");
    post_status.classList.toggle("user-liked");

    update_post(post_id, "DELETE", username);
  } else {
    like_count.innerText = current_likes + 1;
    heart_icon.classList.toggle("fa-regular");
    heart_icon.classList.add("fa-solid");
    post_status.classList.toggle("user-liked");

    update_post(post_id, "POST", username);
  }
}

function update_post(id, method, content = "") {
  const body = {
    content: content,
  };

  try {
    fetch(`/update/${id}`, {
      method: method,
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
      },
    }).then((response) => {
      let status = "";
      response.ok
        ? (status = `[Post ${id}] Update Success`)
        : (status = `[Post ${id}] Update Failed`);
      console.log(response.status + ": " + status);
    });
  } catch (error) {
    console.log(error);
  }
}

function set_unfollow(username) {
  console.log(`/${username}/unfollow`);

  fetch(`/${username}/unfollow`, {
    method: "DELETE",
    body: JSON.stringify({}),
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  })
    .then((response) => {
      response.json();
      console.log("--->", response.status, "<---");
      if (response.ok) {
        console.log(`You have now unfollowed ${username}`);
        fetch_profile(username);
      } else console.log(`Failed unfollowing ${username}`);
    })
    .catch((error) => {
      // Handle network errors or exceptions here
      console.error("Error:", error);
    });
}

function set_follow(username) {
  console.log(`/${username}/follow`);

  fetch(`/${username}/follow`, {
    method: "POST",
    body: JSON.stringify({}),
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  })
    .then((response) => {
      response.json();
      console.log("--->", response.status, "<---");
      if (response.ok) {
        console.log(`You are now following ${username}`);
        fetch_profile(username);
      } else console.log(`Failed following ${username}`);
    })
    .catch((error) => {
      // Handle network errors or exceptions here
      console.error("Error:", error);
    });
}

function create_post(event) {
  event.preventDefault();

  const postTextarea = document.querySelector("#post-content");
  const get_content = postTextarea.value;

  fetch("/create", {
    method: "POST",
    body: JSON.stringify({
      content: get_content,
    }),
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  })
    .then((response) => {
      response.json();
      console.log("--->", response.status, "<---");
      if (response.ok) {
        console.log("Post created succesfully");
        window.location.href = "/";
      }
      console.log("Failed creating post");
    })
    .catch((error) => {
      // Handle network errors or exceptions here
      console.error("Error:", error);
    });
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function timeAgo(dateString) {
  const timestamp = Date.parse(dateString);
  const now = new Date();
  const seconds = Math.floor((now - timestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else {
    return "Just now";
  }
}
