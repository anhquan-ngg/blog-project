// Current authenticated user — populated on load
let currentUser = null; // { username: string, isAdmin: bool } | null
let parent_id = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof window.updateNavAuth === "function") window.updateNavAuth();

  // Fetch current user for comment role-based actions
  const meRes = await fetchApi("/auth/me/", { redirectOn401: false });
  if (meRes.ok) {
    currentUser = {
      username: meRes.data.username || null,
      isAdmin: Boolean(meRes.data.is_staff),
    };
  }

  const postRef = window.POST_ID ?? window.POST_SLUG;
  if (postRef !== undefined && postRef !== null && String(postRef).trim() !== "") {
    const post = await loadPostDetail(postRef);
    const postId = Number(post?.id);
    if (Number.isInteger(postId) && postId > 0) {
      loadComments(postId);
      loadRelatedPosts(postId);
      setupCommentForm(postId);
    }
  }
});

async function loadPostDetail(postRef) {
  toggleLoading(true);
  const res = await fetchApi(`/posts/${postRef}/`);
  toggleLoading(false);

  if (res.ok) {
    const post = res.data;
    document.getElementById("post-detail").style.display = "block";
    document.getElementById("post-title").textContent = post.title;
    document.getElementById("post-author").textContent =
      `By ${post.author.username}`;
    document.getElementById("post-date").textContent = new Date(
      post.created_at,
    ).toLocaleDateString("vi-VN");
    document.getElementById("like-count").textContent = post.likes_count || 0;
    document.getElementById("bookmark-count").textContent =
      post.bookmarks_count || 0;

    const contentDiv = document.getElementById("post-content");
    contentDiv.replaceChildren();

    // Handle both text and EditorJS blocks formats
    if (typeof post.content === "string") {
      const paragraph = document.createElement("p");
      const lines = post.content.split("\n");
      lines.forEach((line, index) => {
        if (index > 0) {
          paragraph.appendChild(document.createElement("br"));
        }
        paragraph.appendChild(document.createTextNode(line));
      });
      contentDiv.appendChild(paragraph);
    } else if (Array.isArray(post.content)) {
      post.content.forEach((block) => {
        if (!block || typeof block !== "object") return;

        if (block.type === "paragraph") {
          const paragraph = document.createElement("p");
          paragraph.textContent = block.data?.text || "";
          contentDiv.appendChild(paragraph);
          return;
        }

        if (block.type === "heading") {
          const rawLevel = Number(block.data?.level);
          const level = Number.isInteger(rawLevel) && rawLevel >= 1 && rawLevel <= 6 ? rawLevel : 1;
          const heading = document.createElement(`h${level}`);
          heading.textContent = block.data?.text || "";
          contentDiv.appendChild(heading);
          return;
        }

        if (block.type === "image") {
          const imageUrl = block.data?.url;
          if (!isSafeContentMediaUrl(imageUrl))
            return;
          const figure = document.createElement("figure");
          const allowedAlignments = ["left", "center", "right"];
          const align = allowedAlignments.includes(block.data?.alignment)
            ? block.data.alignment
            : "center";
          figure.style.textAlign = align;
          figure.style.margin = "32px 0";

          const image = document.createElement("img");
          image.src = imageUrl;
          image.alt = block.data?.caption || "";
          image.style.maxWidth = "100%";
          image.style.height = "auto";
          image.style.display = "inline-block";
          figure.appendChild(image);

          if (block.data?.caption) {
            const caption = document.createElement("figcaption");
            caption.style.color = "#707072";
            caption.style.fontSize = "14px";
            caption.style.marginTop = "8px";
            caption.style.fontWeight = "500";
            caption.textContent = block.data.caption;
            figure.appendChild(caption);
          }

          contentDiv.appendChild(figure);
        }
      });
    }

    if (post.tags && post.tags.length > 0) {
      document.getElementById("post-tags").innerHTML = post.tags
        .map((t) => `<span class="tag-pill">#${escapeHtml(t.name)}</span>`)
        .join("");
    }

    // Logic like / bookmark buttons
    const btnLike = document.getElementById("btn-like");
    if (post.is_liked) btnLike.classList.add("active");
    btnLike.onclick = () => toggleLike(post.id, btnLike);

    const btnBookmark = document.getElementById("btn-bookmark");
    if (post.is_bookmarked) btnBookmark.classList.add("active");
    btnBookmark.onclick = () => toggleBookmark(post.id, btnBookmark);

    return post;
  } else {
    document.getElementById("post-detail").innerHTML =
      `<h1 class="error-msg">Post not found or server error.</h1>`;
    document.getElementById("post-detail").style.display = "block";
    return null;
  }
}

function isSafeContentMediaUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return false;

  const allowedOrigin = [
    window.location.origin,
    "https://quanna-blog-bucket.s3.ap-southeast-1.amazonaws.com"
  ]

  try {
    const parsed = new URL(rawUrl, window.location.origin); // Automatically resolve relative URLs against current origin
    const isSafeProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const isAllowedOrigin = allowedOrigin.includes(parsed.origin);
    return isSafeProtocol && isAllowedOrigin;
  } catch {
    return false;
  }
}

async function loadComments(postId) {
  const res = await fetchApi(`/posts/${postId}/comments/`);
  if (!res.ok) return;

  document.getElementById("comments-section").style.display = "block";
  const list = document.getElementById("comments-list");
  const comments = Array.isArray(res.data?.results) ? res.data.results : [];

  if (comments.length === 0) {
    const empty = document.createElement("p");
    empty.className = "comment-empty";
    empty.textContent = "No comments yet.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...comments.map((c) => createCommentCard(c, postId)));
}

// ── Comment card builder ──────────────────────────────────────────────────────

function createCommentCard(c, postId) {
  const isAuthor = Boolean(
    currentUser && currentUser.username && currentUser.username === c.author?.username
  );
  const isAdmin = Boolean(currentUser?.isAdmin);

  const wrap = document.createElement("div");
  wrap.className = "comment-item";
  wrap.dataset.commentId = c.id;

  // Header: author name + date
  const header = document.createElement("div");
  header.className = "comment-header";

  const authorEl = document.createElement("span");
  authorEl.className = "comment-author-name";
  authorEl.textContent = c.author?.username || "Guest";

  const dateEl = document.createElement("span");
  dateEl.className = "comment-date";
  dateEl.textContent = new Date(c.created_at).toLocaleDateString("vi-VN");

  header.append(authorEl, dateEl);

  // Content
  const contentEl = document.createElement("div");
  contentEl.className = "comment-content";
  contentEl.textContent = c.content; // textContent = XSS-safe

  // Optional image
  let imgEl = null;
  if (c.image_url && isSafeContentMediaUrl(c.image_url)) {
    imgEl = document.createElement("img");
    imgEl.src = c.image_url;
    imgEl.alt = "Comment attachment";
    imgEl.className = "comment-image";
    imgEl.loading = "lazy";
  }

  // Action buttons — role-based
  const actions = document.createElement("div");
  actions.className = "comment-actions";

  if (isAuthor) {
    actions.append(
      makeCommentBtn("Reply", "reply", () => handleReply(c, c.id)),
      makeCommentBtn("Edit", "edit", () => handleEdit(c, wrap, postId)),
      makeCommentBtn("Delete", "delete", () => handleDelete(c.id, wrap, postId))
    );
  } else if (isAdmin) {
    actions.append(
      makeCommentBtn("Reply", "reply", () => handleReply(c, c.id)),
      makeCommentBtn("Delete", "delete", () => handleDelete(c.id, wrap, postId))
    );
  } else {
    actions.append(
      makeCommentBtn("Reply", "reply", () => handleReply(c, c.id))
    );
  }

  // "Xem N câu trả lời" — toggle replies inline
  const replies = Array.isArray(c.replies) ? c.replies : [];
  const repliesCount = replies.length;
  let repliesBtn = null;
  let repliesContainer = null;

  if (repliesCount > 0) {
    repliesContainer = document.createElement("div");
    repliesContainer.className = "comment-replies-container";

    repliesBtn = document.createElement("button");
    repliesBtn.type = "button";
    repliesBtn.className = "comment-replies-link";
    repliesBtn.textContent = `View ${repliesCount} replies`;

    let repliesLoaded = false;
    repliesBtn.addEventListener("click", () => {
      const isOpen = repliesContainer.style.display === "block";
      if (isOpen) {
        repliesContainer.style.display = "none";
        repliesBtn.textContent = `View ${repliesCount} replies`;
      } else {
        if (!repliesLoaded) {
          repliesContainer.replaceChildren(
            ...replies.map((r) => createReplyCard(r, postId))
          );
          repliesLoaded = true;
        }
        repliesContainer.style.display = "block";
        repliesBtn.textContent = "Hide replies";
      }
    });
  }

  // Assemble
  wrap.append(header, contentEl);
  if (imgEl) wrap.appendChild(imgEl);
  wrap.append(actions);
  if (repliesBtn) wrap.appendChild(repliesBtn);
  if (repliesContainer) wrap.appendChild(repliesContainer);

  return wrap;
}

function makeCommentBtn(label, variant, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `comment-action-btn comment-action-btn--${variant}`;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

// ── Reply card (nested, no further recursion) ──────────────────────────────────

function createReplyCard(r, postId) {
  const isAuthor = Boolean(
    currentUser && currentUser.username && currentUser.username === r.author?.username
  );
  const isAdmin = Boolean(currentUser?.isAdmin);

  const wrap = document.createElement("div");
  wrap.className = "comment-item comment-reply-item";
  wrap.dataset.commentId = r.id;

  // Header
  const header = document.createElement("div");
  header.className = "comment-header";

  const authorEl = document.createElement("span");
  authorEl.className = "comment-author-name";
  authorEl.textContent = r.author?.username || "Guest";

  const dateEl = document.createElement("span");
  dateEl.className = "comment-date";
  dateEl.textContent = new Date(r.created_at).toLocaleDateString("vi-VN");

  header.append(authorEl, dateEl);

  // Content
  const contentEl = document.createElement("div");
  contentEl.className = "comment-content";
  contentEl.textContent = r.content;

  // Optional image
  let imgEl = null;
  if (r.image_url && isSafeContentMediaUrl(r.image_url)) {
    imgEl = document.createElement("img");
    imgEl.src = r.image_url;
    imgEl.alt = "Reply attachment";
    imgEl.className = "comment-image";
    imgEl.loading = "lazy";
  }

  // Action buttons — replies have no "Trả lời" (no deeper nesting)
  const actions = document.createElement("div");
  actions.className = "comment-actions";

  if (isAuthor) {
    actions.append(
      makeCommentBtn("Edit", "edit", () => handleEdit(r, wrap, postId, true)),
      makeCommentBtn("Delete", "delete", () => handleDelete(r.id, wrap, postId))
    );
  } else if (isAdmin) {
    actions.append(
      makeCommentBtn("Delete", "delete", () => handleDelete(r.id, wrap, postId))
    );
  }

  wrap.append(header, contentEl);
  if (imgEl) wrap.appendChild(imgEl);
  wrap.append(actions);

  return wrap;
}

// ── Action handlers ───────────────────────────────────────────────────────────

function handleReply(comment) {
  // Write to GLOBAL variable — avoid shadowing
  parent_id = comment.id;

  const textarea = document.getElementById("comment-content");
  if (!textarea) return;
  textarea.value = `@${comment.author?.username || "user"} `;
  textarea.focus();
  textarea.scrollIntoView({ behavior: "smooth", block: "center" });

  // Display "Replying to @username" banner
  showReplyBanner(comment.author?.username || "user");
}

function showReplyBanner(username) {
  let banner = document.getElementById("reply-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "reply-banner";
    banner.className = "reply-banner";
    const form = document.getElementById("comment-form");
    if (form) form.parentNode.insertBefore(banner, form);
  }
  banner.innerHTML = ``;
  const text = document.createElement("span");
  text.textContent = `Replying to @${username}`;
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "reply-banner-cancel";
  cancelBtn.textContent = "× Cancel";
  cancelBtn.addEventListener("click", () => {
    parent_id = null;
    const textarea = document.getElementById("comment-content");
    if (textarea) textarea.value = "";
    banner.remove();
  });
  banner.append(text, cancelBtn);
}

function clearReplyBanner() {
  const banner = document.getElementById("reply-banner");
  if (banner) banner.remove();
}

async function handleDelete(commentId, cardEl) {
  if (!confirm("Are you sure you want to delete this comment?")) return;
  const res = await fetchApi(`/comments/${commentId}/`, {
    method: "DELETE",
  });
  if (res.ok || res.status === 204) {
    cardEl.remove();
  } else {
    alert("Failed to delete comment. Please try again.");
  }
}

function handleEdit(comment, cardEl, postId, isReply = false) {
  if (cardEl.classList.contains("is-editing")) return;
  cardEl.classList.add("is-editing");

  const contentEl = cardEl.querySelector(".comment-content");
  const actions = cardEl.querySelector(".comment-actions");
  const originalText = contentEl.textContent;

  const textarea = document.createElement("textarea");
  textarea.className = "comment-edit-textarea";
  textarea.value = originalText;
  textarea.rows = 3;
  contentEl.replaceWith(textarea);
  textarea.focus();

  function restoreActions() {
    const buttons = []
    if (!isReply) {
      buttons.push(makeCommentBtn("Reply", "reply", () => handleReply(comment, comment.id)))
    }
    buttons.push(
      makeCommentBtn("Edit", "edit", () => handleEdit(comment, cardEl, postId, isReply)),
      makeCommentBtn("Delete", "delete", () => handleDelete(comment.id, cardEl, postId))
    );
    actions.replaceChildren(...buttons);
  }

  actions.replaceChildren(
    makeCommentBtn("Save", "save", async () => {
      const newText = textarea.value.trim();
      if (!newText) return;
      const res = await fetchApi(`/comments/${comment.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ content: newText }),
      });
      if (res.ok) {
        const newEl = document.createElement("div");
        newEl.className = "comment-content";
        newEl.textContent = res.data.content || newText;
        textarea.replaceWith(newEl);
        cardEl.classList.remove("is-editing");
        comment.content = res.data.content || newText;
        restoreActions();
      } else {
        alert("Failed to update comment. Please try again.");
      }
    }),
    makeCommentBtn("Cancel", "cancel", () => {
      const restoredEl = document.createElement("div");
      restoredEl.className = "comment-content";
      restoredEl.textContent = originalText;
      textarea.replaceWith(restoredEl);
      cardEl.classList.remove("is-editing");
      restoreActions();
    })
  );
}

function setupCommentForm(postId) {
  // Do not accept parent_id as parameter — use GLOBAL variable directly
  const form = document.getElementById("comment-form");
  const fileInput = document.getElementById("comment-image");
  const fileNameDisplay = document.getElementById("comment-image-name");
  const errorDisplay = document.getElementById("comment-error");
  const submitBtn = document.getElementById("btn-submit-comment");
  if (!fileInput) return;
  if (!form) return;

  // Handle file name display when selecting image
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      fileNameDisplay.textContent = fileInput.files[0].name;
    } else {
      fileNameDisplay.textContent = "";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorDisplay.textContent = "";
    const content = document.getElementById("comment-content").value.trim();
    if (!content) return;

    // Disable submit button during processing
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    let fileId = null;

    try {
      // 1. If there's an attachment, call upload API first to get file_id
      if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("image", fileInput.files[0]);

        const uploadRes = await fetchApi("/files/upload/", {
          method: "POST",
          body: formData,
          redirectOn401: false,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image");
        }
        fileId = uploadRes.data.id;
      }

      // 2. Send Comment content + file_id to Comments Endpoint
      const payload = {
        content: content,
        parent_id: parent_id
      };
      if (fileId) {
        payload.file_id = fileId;
      }

      const commentRes = await fetchApi(`/posts/${postId}/comments/`, {
        method: "POST",
        body: JSON.stringify(payload),        
        redirectOn401: false,
      });

      if (commentRes.ok) {
        // Reset form and reload comments list
        form.reset();
        parent_id = null;      // ✓ Reset GLOBAL variable
        clearReplyBanner();    // Clear reply banner
        fileNameDisplay.textContent = "";
        fileInput.value = "";
        await loadComments(postId);
      } else {
        // If 401 error or token expires, backend returns error message
        if (commentRes.status === 401) {
            throw new Error("You must be logged in to comment.");
        }
        throw new Error(commentRes.data?.detail || "Failed to post comment");
      }
    } catch (err) {
      errorDisplay.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send comment";
    }
  });
}

async function loadRelatedPosts(postId) {
  const res = await fetchApi(`/posts/${postId}/related/`);
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    document.getElementById("related-posts-section").style.display = "block";
    const grid = document.getElementById("related-posts-grid");
    
    // Add grid styles to force 4-column display (4 posts per row)
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(4, 1fr)";
    grid.style.gap = "16px";

    // Limit to 4 posts max
    grid.innerHTML = res.data.slice(0, 4)
      .map(
        (p) => `
            <article class="post-card">
                <a href="/post/${encodeURIComponent(p.id)}/"><div class="placeholder-img" style="background:#f5f5f5; width:100%; aspect-ratio:1/1; object-fit:cover;"></div></a>
                <h3 class="post-title" style="margin-top:12px; font-size:16px;"><a href="/post/${encodeURIComponent(p.id)}/" style="color:var(--ink);">${escapeHtml(p.title)}</a></h3>
            </article>
        `,  
      )
      .join("");
  }
}

function toggleLoading(isLoading) {
  document.getElementById("loading").style.display = isLoading
    ? "block"
    : "none";
}

async function toggleLike(postId, btn) {
  const isLiking = !btn.classList.contains("active");
  const res = await fetchApi(`/posts/${postId}/like/`, {
    method: "POST"
  });
  if (res.ok) {
    btn.classList.toggle("active");
    const countSpan = document.getElementById("like-count");
    countSpan.textContent = res.data.likes_count || 0;
  }
}

async function toggleBookmark(postId, btn) {
  const isBookmaking = !btn.classList.contains("active");
  const res = await fetchApi(`/posts/${postId}/bookmark/`, {
    method: "POST",
  });
  if (res.ok) {
    btn.classList.toggle("active");
    const countSpan = document.getElementById("bookmark-count");
    countSpan.textContent = res.data.bookmarks_count || 0;
  }
}
