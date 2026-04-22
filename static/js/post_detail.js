document.addEventListener("DOMContentLoaded", async () => {
  if (typeof window.updateNavAuth === "function") window.updateNavAuth();
  
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
        .map((t) => `<span class="tag-pill">#${t.name}</span>`)
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
  // Assuming API is /posts/{id}/comments/
  const res = await fetchApi(`/posts/${postId}/comments/`);
  if (res.ok) {
    document.getElementById("comments-section").style.display = "block";
    const list = document.getElementById("comments-list");
    list.innerHTML = res.data.results
      .map(
        (c) => `
            <div class="comment-item" style="padding: 16px 0; border-bottom: 1px solid #CACACB; margin-bottom: 8px">
                <div class="comment-author" style="font-weight: 500; color: #111111; margin-bottom: 4px">${c.author?.username || "Guest"} <span style="color: #707072; font-weight: 400; font-size: 12px; margin-left: 8px">${new Date(c.created_at).toLocaleDateString("vi-VN")}</span></div>
                <div class="comment-content" style="color: #111111; font-size: 16px; margin-bottom: 8px">${c.content}</div>
                ${c.image_url ? `<img src="${c.image_url}" style="max-width: 200px; border-radius: 8px; display: block; margin-top: 8px">` : ''}
            </div>
        `,
      )
      .join("");
  }
}

function setupCommentForm(postId) {
  const form = document.getElementById("comment-form");
  const fileInput = document.getElementById("comment-image");
  const fileNameDisplay = document.getElementById("comment-image-name");
  const errorDisplay = document.getElementById("comment-error");
  const submitBtn = document.getElementById("btn-submit-comment");

  if (!form) return;

  // Xử lý hiển thị tên file khi chọn ảnh
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

    // Disabled submit nút trong quá trình xử lý
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    let fileId = null;

    try {
      // 1. Nếu có file đính kèm, gọi API upload file trước để lấy file_id
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

      // 2. Gửi nội dung Comment + file_id lên Endpoint Comments
      const payload = {
        content: content
      };
      if (fileId) {
        payload.file_id = fileId;
      }

      const commentRes = await fetchApi(`/posts/${postId}/comments/`, {
        method: "POST",
        body: JSON.stringify(payload),        redirectOn401: false,
      });

      if (commentRes.ok) {
        // Reset form và load lại danh sách comment
        form.reset();
        fileNameDisplay.textContent = "";
        fileInput.value = "";
        await loadComments(postId);
      } else {
        // Nếu lỗi 401 hoặc token hết hạn thì backend sẽ trả về message lỗi
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
  if (res.ok && res.data.length > 0) {
    document.getElementById("related-posts-section").style.display = "block";
    const grid = document.getElementById("related-posts-grid");
    
    // Thêm style grid để ép hiển thị 4 cột (4 bài trên 1 dòng)
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(4, 1fr)";
    grid.style.gap = "16px";

    // Giới hạn hiển thị tối đa 4 bài
    grid.innerHTML = res.data.slice(0, 4)
      .map(
        (p) => `
            <article class="post-card">
                <a href="/post/${p.id}/"><div class="placeholder-img" style="background:#f5f5f5; width:100%; aspect-ratio:1/1; object-fit:cover;"></div></a>
                <h3 class="post-title" style="margin-top:12px; font-size:16px;"><a href="/post/${p.id}/" style="color:var(--ink);">${p.title}</a></h3>
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
    method: isLiking ? "POST" : "DELETE",
  });
  if (res.ok) {
    btn.classList.toggle("active");
    const countSpan = document.getElementById("like-count");
    let current = parseInt(countSpan.textContent, 10);
    countSpan.textContent = isLiking ? current + 1 : current - 1;
  }
}

async function toggleBookmark(postId, btn) {
  const isBookmaking = !btn.classList.contains("active");
  const res = await fetchApi(`/posts/${postId}/bookmark/`, {
    method: isBookmaking ? "POST" : "DELETE",
  });
  if (res.ok) {
    btn.classList.toggle("active");
    const countSpan = document.getElementById("bookmark-count");
    let current = parseInt(countSpan.textContent, 10);
    countSpan.textContent = isBookmaking ? current + 1 : current - 1;
  }
}
