const API_BASE = "/api";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

window.escapeHtml = escapeHtml;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

/**
 * Fetch wrapper that automatically sends token (uses auth via Cookie)
 */
async function fetchApi(endpoint, options = {}) {
  const { redirectOn401 = true, ...fetchOptions } = options;
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const token = getCookie("auth_token");

  let headers = {
    Accept: "application/json",
    ...fetchOptions.headers,
  };

  // Nếu options.body KHÔNG PHẢI là FormData, tự thêm Content-Type JSON
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  } else if (fetchOptions.body === undefined) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      // Needs credentials (cookie) for auth
      credentials: "same-origin",
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && redirectOn401) {
      // Redirect to login on 401 Unauthorized
      window.location.href = "/login/";
      return { ok: false, status: 401, data };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err) {
    console.error("Fetch error:", err);
    return {
      ok: false,
      status: 500,
      data: { detail: err.message },
    };
  }
}

const NOTIFICATION_DROPDOWN_LIMIT = 8;

function formatNotificationText(notification) {
  const actor = notification.actor_username || "Someone";
  if (notification.type === "liked_post") {
    return `${actor} liked your post.`;
  }
  if (notification.type === "commented_post") {
    return `${actor} commented on your post.`;
  }
  if (notification.type === "replied_comment") {
    return `${actor} replied to your comment.`;
  }
  return `${actor} sent you a notification.`;
}

function formatNotificationTime(isoTime) {
  if (!isoTime) return "";

  const now = Date.now();
  const timestamp = new Date(isoTime).getTime();
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return new Date(isoTime).toLocaleDateString("vi-VN");
}

window.notificationDropdown = {
  initialized: false,
  notifications: [],

  async init() {
    if (this.initialized) return;

    this.initialized = true;
    this.bindEvents();
    await this.refresh();
  },

  bindEvents() {
    const trigger = document.getElementById("nav-notification-trigger");
    const menu = document.getElementById("nav-notification-menu");
    const list = document.getElementById("nav-notification-list");

    if (!trigger || !menu || !list) return;

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = menu.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (!menu.classList.contains("open")) return;

      if (!menu.contains(event.target) && !trigger.contains(event.target)) {
        menu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("open")) {
        menu.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    list.addEventListener("click", async (event) => {
      const item = event.target.closest("[data-notification-id]");
      if (!item) return;

      const notificationId = item.getAttribute("data-notification-id");
      if (!notificationId) return;

      await this.markAsRead(notificationId);
    });
  },

  render() {
    const list = document.getElementById("nav-notification-list");
    const badge = document.getElementById("nav-notification-dot");
    if (!list || !badge) return;

    const unreadCount = this.notifications.filter((n) => !n.is_read).length;
    badge.style.display = unreadCount > 0 ? "block" : "none";

    if (this.notifications.length === 0) {
      list.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
      return;
    }

    list.innerHTML = this.notifications
      .map((notification) => {
        const statusClass = notification.is_read ? "is-read" : "is-unread";
        return `
          <button type="button" class="notification-item ${statusClass}" data-notification-id="${notification.id}">
            <span class="notification-item-text">${formatNotificationText(notification)}</span>
            <span class="notification-item-meta">${formatNotificationTime(notification.created_at)}</span>
          </button>
        `;
      })
      .join("");
  },

  async refresh() {
    const result = await fetchApi(`/notifications/?limit=${NOTIFICATION_DROPDOWN_LIMIT}`);
    if (!result.ok) return;

    this.notifications = result.data.results || [];
    this.render();
  },

  async markAsRead(notificationId) {
    const selected = this.notifications.find(
      (notification) => String(notification.id) === String(notificationId),
    );

    if (!selected || selected.is_read) return;

    const result = await fetchApi(`/notifications/${notificationId}/read/`, {
      method: "PATCH",
    });

    if (!result.ok) return;

    selected.is_read = true;
    this.render();
  },
};

function renderNavForAuthenticatedUser(isAdmin) {
  const adminLink = isAdmin
    ? '<a href="/admin-portal/" class="nike-nav-link">Admin</a>'
    : "";

  return `
    <div class="notification-dropdown" id="nav-notification-dropdown">
      <button
        type="button"
        title="Notifications"
        class="notification-trigger"
        id="nav-notification-trigger"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="badge-dot" id="nav-notification-dot"></span>
      </button>

      <div class="notification-menu" id="nav-notification-menu">
        <div class="notification-menu-header">
          <span>Notifications</span>
          <a href="/profile/#notifications" class="notification-menu-link">View all</a>
        </div>
        <div class="notification-menu-list" id="nav-notification-list">
          <div class="notification-empty">Loading...</div>
        </div>
      </div>
    </div>

    ${adminLink}
    <a href="/post/create/" class="nike-nav-link">Create Post</a>
    <a href="/profile/" class="nike-nav-link">Profile</a>
    <a href="#" onclick="window.logoutEvent(event)" class="nike-nav-link">Logout</a>
  `;
}

// Global functions for authentication UI state
window.updateNavAuth = async function () {
  const hasToken = getCookie("auth_token");
  if (!hasToken) return;

  const nav = document.querySelector(".nav-links");
  if (!nav) return;

  let isAdmin = false;
  const meResult = await fetchApi("/auth/me/");
  if (meResult.ok) {
    isAdmin = Boolean(meResult.data && meResult.data.is_staff);
  }

  nav.innerHTML = renderNavForAuthenticatedUser(isAdmin);

  window.notificationDropdown.initialized = false;
  window.notificationDropdown.init();
};

window.logoutEvent = function (e) {
  e.preventDefault();
  document.cookie =
    "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.reload();
};

document.addEventListener("DOMContentLoaded", () => {
  // Apply standard auth formatting styles automatically if missing
  if (!document.getElementById("nike-auth-style")) {
    const style = document.createElement("style");
    style.id = "nike-auth-style";
    style.innerHTML = `
            .nav-links .nike-nav-link {
                font-family: "Helvetica Now Text Medium", Helvetica, Arial, sans-serif;
                font-size: 16px;
                font-weight: 500;
                color: #111111;
                text-decoration: none;
                transition: color 0.2s ease;
            }
            .nav-links .nike-nav-link:hover {
                color: #707072;
            }
        `;
    document.head.appendChild(style);
  }

  if (typeof window.updateNavAuth === "function") {
    window.updateNavAuth();
  }
});
