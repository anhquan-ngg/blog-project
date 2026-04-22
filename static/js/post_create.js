document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.updateNavAuth === "function") window.updateNavAuth();
  loadCategories();

  const form = document.getElementById("create-post-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("post-title").value.trim();
    const categoryId = document.getElementById("post-category").value;
    const tagsInput = document.getElementById("post-tags").value;
    const bodyContent = document.getElementById("post-content").value.trim();
    const msgDiv = document.getElementById("form-msg");

    // Disable submit
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;
    msgDiv.className = "message";
    msgDiv.textContent = "Processing...";

    // Parse content to array blocks to match EditorJS/api schema
    // Defaults to 1 paragraph block, or split by line.
    const blocks = bodyContent
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((text) => ({
        type: "paragraph",
        data: { text },
      }));

    let parsedTags = [];
    if (tagsInput) {
      parsedTags = tagsInput
        .split(",")
        .map((tag) => parseInt(tag.trim(), 10))
        .filter((t) => !isNaN(t));
    }

    const payload = {
      title,
      category: parseInt(categoryId),
      tags: parsedTags,
      content: blocks,
    };

    const res = await fetchApi("/posts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    btn.disabled = false;

    if (res.ok) {
      msgDiv.textContent = "Posts created successfully!";
      msgDiv.classList.add("ok");
      setTimeout(() => {
        window.location.href = `/post/${res.data.id}/`;
      }, 1000);
    } else {
      msgDiv.textContent = `Error: ${JSON.stringify(res.data) || "Cannot create post."}`;
      msgDiv.classList.add("error");
    }
  });
});

async function loadCategories() {
  const res = await fetchApi("/categories/");
  if (res.ok && Array.isArray(res.data)) {
    const select = document.getElementById("post-category");
    select.innerHTML =
      `<option value="">-- Select category --</option>` +
      res.data
        .map(
          (cat) =>
            `<option value="${cat.id}">${cat.name.toUpperCase()}</option>`,
        )
        .join("");
  }
}
