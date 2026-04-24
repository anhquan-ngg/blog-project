const PAGE_SIZE = 10;
let currentUserId = null;

const PROFILE_TAB_CONFIG = {
    "my-posts": {
        baseEndpoint: "/posts/",
        title: "MY POSTS",
        subtitle: "Danh sách bài viết bạn đã tạo.",
        empty: "Bạn chưa có bài viết nào.",
        badge: "Author",
    },
    liked: {
        baseEndpoint: "/me/liked/",
        title: "LIKED POSTS",
        subtitle: "Danh sách bài viết bạn đã like gần đây.",
        empty: "Bạn chưa like bài viết nào.",
        badge: "Liked",
    },
    bookmarked: {
        baseEndpoint: "/me/bookmarks/",
        title: "BOOKMARKED POSTS",
        subtitle: "Danh sách bài viết bạn đã lưu để đọc sau.",
        empty: "Bạn chưa bookmark bài viết nào.",
        badge: "Bookmarked",
    },
};

// Per-tab pagination state
const tabState = {
    "my-posts": { currentPage: 1, totalCount: 0 },
    liked: { currentPage: 1, totalCount: 0 },
    bookmarked: { currentPage: 1, totalCount: 0 },
};

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.updateNavAuth === "function") window.updateNavAuth();

    bindTabs();
    bindLogout();
    await loadProfile();
    activateTab("my-posts");
});

function bindTabs() {
    const tabs = document.querySelectorAll(".profile-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const targetTab = tab.dataset.tab;
            activateTab(targetTab);
        });
    });
}

function bindLogout() {
    const logoutButton = document.getElementById("btn-logout");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", async () => {
        const res = await fetchApi("/auth/logout/", { method: "POST" });
        if (res.ok) {
            window.location.href = "/";
            return;
        }

        alert("Logout error");
    });
}

async function loadProfile() {
    const res = await fetchApi("/auth/me/");
    if (!res.ok) return;

    currentUserId = res.data.id;

    const nameEl = document.getElementById("profile-name");
    const emailEl = document.getElementById("profile-email");
    if (nameEl) nameEl.textContent = res.data.username || "MEMBER";
    if (emailEl) emailEl.textContent = res.data.email || "";
}

async function activateTab(tabKey) {
    if (!PROFILE_TAB_CONFIG[tabKey]) return;

    const tabs = document.querySelectorAll(".profile-tab");
    tabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.tab === tabKey);
    });

    const titleEl = document.getElementById("profile-section-title");
    const subtitleEl = document.getElementById("profile-section-subtitle");
    if (titleEl) titleEl.textContent = PROFILE_TAB_CONFIG[tabKey].title;
    if (subtitleEl) subtitleEl.textContent = PROFILE_TAB_CONFIG[tabKey].subtitle;

    // Reset to page 1 when switching tabs
    tabState[tabKey].currentPage = 1;
    await loadPostCollection(tabKey);
}

async function loadPostCollection(tabKey, page) {
    const grid = document.getElementById("profile-posts-grid");
    if (!grid) return;

    const targetPage = page ?? tabState[tabKey].currentPage;
    tabState[tabKey].currentPage = targetPage;

    grid.replaceChildren(createStatusText("Loading posts..."));
    clearPagination();

    const config = PROFILE_TAB_CONFIG[tabKey];
    const offset = (targetPage - 1) * PAGE_SIZE;
    let url = `${config.baseEndpoint}?limit=${PAGE_SIZE}&offset=${offset}`;

    if (tabKey === "my-posts" && currentUserId) {
        url += `&author=${currentUserId}`;
    }

    const res = await fetchApi(url);
    if (!res.ok) {
        grid.replaceChildren(createStatusText("Không tải được dữ liệu. Vui lòng thử lại."));
        return;
    }

    const totalCount = res.data?.count ?? 0;
    tabState[tabKey].totalCount = totalCount;

    const posts = Array.isArray(res.data?.results) ? res.data.results : [];
    if (posts.length === 0) {
        grid.replaceChildren(createStatusText(config.empty));
        return;
    }

    const cards = posts.map((post) => createPostCard(post, config.badge, tabKey === "my-posts"));
    grid.replaceChildren(...cards);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    renderPagination(tabKey, targetPage, totalPages);
}

// ── Pagination helpers ───────────────────────────────────────────────────────

function clearPagination() {
    const container = document.getElementById("profile-pagination");
    if (container) container.replaceChildren();
}

function renderPagination(tabKey, currentPage, totalPages) {
    const container = document.getElementById("profile-pagination");
    if (!container || totalPages <= 1) return;

    container.replaceChildren();

    // Prev button
    const prev = makePaginationBtn("←", currentPage > 1, () =>
        loadPostCollection(tabKey, currentPage - 1)
    );
    container.appendChild(prev);

    // Page number buttons (show up to 7 pages with ellipsis)
    const pageNums = buildPageNumbers(currentPage, totalPages);
    pageNums.forEach((item) => {
        if (item === "...") {
            const ellipsis = document.createElement("span");
            ellipsis.className = "pagination-ellipsis";
            ellipsis.textContent = "…";
            container.appendChild(ellipsis);
        } else {
            const btn = makePaginationBtn(String(item), true, () =>
                loadPostCollection(tabKey, item)
            );
            if (item === currentPage) btn.classList.add("is-current");
            container.appendChild(btn);
        }
    });

    // Next button
    const next = makePaginationBtn("→", currentPage < totalPages, () =>
        loadPostCollection(tabKey, currentPage + 1)
    );
    container.appendChild(next);

    // Info text
    const info = document.createElement("span");
    info.className = "pagination-info";
    info.textContent = `Trang ${currentPage} / ${totalPages}`;
    container.appendChild(info);
}

function makePaginationBtn(label, enabled, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pagination-btn";
    btn.textContent = label;
    btn.disabled = !enabled;
    if (enabled) btn.addEventListener("click", onClick);
    return btn;
}

function buildPageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
}

function createStatusText(text) {
    const p = document.createElement("p");
    p.className = "muted profile-status";
    p.textContent = text;
    return p;
}

function createPostCard(post, badgeText, isMyPost = false) {
    const article = document.createElement("article");
    article.className = "profile-post";

    const link = document.createElement("a");
    link.className = "profile-post-link";
    link.href = `/post/${encodeURIComponent(post.id)}/`;

    const image = createThumbnail(post);
    const meta = document.createElement("div");
    meta.className = "profile-meta";

    const title = document.createElement("h3");
    title.textContent = post.title || "UNTITLED";

    const infoRow = document.createElement("div");
    infoRow.className = "profile-meta-row";

    const author = document.createElement("span");
    author.className = "text-xs muted";
    author.textContent = post.author?.username || "Unknown";

    const badge = document.createElement("span");
    badge.className = "profile-badge";
    badge.textContent = badgeText;

    const date = document.createElement("p");
    date.className = "text-xs muted";
    date.textContent = formatDate(post.created_at);

    infoRow.append(author, badge);
    meta.append(title, infoRow, date);
    link.append(image, meta);
    article.append(link);

    if (isMyPost) {
        const actions = document.createElement("div");
        actions.className = "profile-post-actions";
        
        const btnEdit = document.createElement("a");
        btnEdit.className = "btn-action";
        btnEdit.textContent = "Edit";
        btnEdit.href = `/post/${encodeURIComponent(post.id)}/edit/`;

        const btnDelete = document.createElement("button");
        btnDelete.className = "btn-action delete";
        btnDelete.textContent = "Delete";
        btnDelete.type = "button";
        btnDelete.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this post?")) {
                const res = await fetchApi(`/posts/${post.id}/`, { method: "DELETE" });
                if (res.ok) {
                    loadPostCollection("my-posts");
                } else {
                    alert("Failed to delete post");
                }
            }
        });

        actions.append(btnEdit, btnDelete);
        article.append(actions);
    }

    return article;
}

function createThumbnail(post) {
    const image = document.createElement("img");
    image.className = "profile-media";
    image.loading = "lazy";

    if (isSafeImageUrl(post.thumbnail)) {
        image.src = post.thumbnail;
        image.alt = post.title || "Post thumbnail";
    } else {
        image.alt = "No thumbnail";
    }

    return image;
}

function isSafeImageUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) return false;

    const allowedOrigins = [
        window.location.origin,
        "https://quanna-blog-bucket.s3.ap-southeast-1.amazonaws.com",
    ];

    try {
        const parsed = new URL(rawUrl, window.location.origin);
        const isSafeProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
        const isAllowedOrigin = allowedOrigins.includes(parsed.origin);
        return isSafeProtocol && isAllowedOrigin;
    } catch {
        return false;
    }
}

function formatDate(isoTime) {
    if (!isoTime) return "";
    return new Date(isoTime).toLocaleDateString("vi-VN");
}