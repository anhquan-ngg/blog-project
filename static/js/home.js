let currentPageUrl = "/posts/";

document.addEventListener("DOMContentLoaded", () => {
  if (typeof updateNavAuth === "function") updateNavAuth();
  loadCategories();
  loadLatestPosts(currentPageUrl);
});

async function loadCategories() {
  const res = await fetchApi("/categories/");
  if (res.ok) {
    const container = document.getElementById("category-list");
    container.innerHTML = res.data
      .map(
        (cat) =>
          `<a href="/search/?category=${encodeURIComponent(cat.slug)}" class="cat-link">${escapeHtml(cat.name).toUpperCase()}</a>`,
      )
      .join("");
  }
}
async function loadLatestPosts(url) {
  const res = await fetchApi(url);
  if (res.ok) {
    const container = document.getElementById("post-grid");
    
    // Clear fallback if empty
    if (!res.data.results || res.data.results.length === 0) {
       container.innerHTML = '<p class="muted" style="grid-column: 1/-1; text-align: center;">No posts available.</p>';
       return;
    }

    container.innerHTML = res.data.results
      .map(
        (post) => `
            <article class="post-card">
                <a href="/post/${post.slug || post.id}/">
                    <div class="post-img-cover">
                        <!-- Thumbnail Image -->
                        ${post.thumbnail ? 
                            `<img src="${post.thumbnail}" alt="${post.title}" class="placeholder-img" style="background:#f5f5f5; width:100%; aspect-ratio:1/1; object-fit: cover;">` : 
                            `<div class="placeholder-img" style="background:#f5f5f5; width:100%; aspect-ratio:1/1;"></div>`
                        }
                    </div>
                </a>
                <div class="post-meta">
                    <a href="/post/${post.slug || post.id}/">
                        <h3 class="post-title">${escapeHtml(post.title)}</h3>
                    </a>
                    <p class="post-date text-xs">${new Date(post.created_at).toLocaleDateString("vi-VN")}</p>
                </div>
            </article>
        `,
      )
      .join("");

    renderPagination(res.data.previous, res.data.next);
  }
}

function renderPagination(prevUrl, nextUrl) {
  const paginationContainer = document.querySelector(".pagination-container");
  if (!paginationContainer) return;

  paginationContainer.innerHTML = "";

  if (prevUrl) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-outline";
    prevBtn.textContent = "Previous";
    prevBtn.onclick = () => loadLatestPosts(prevUrl);
    paginationContainer.appendChild(prevBtn);
  }

  if (nextUrl) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-outline";
    nextBtn.textContent = "Next";
    nextBtn.onclick = () => loadLatestPosts(nextUrl);
    paginationContainer.appendChild(nextBtn);
  }
}
