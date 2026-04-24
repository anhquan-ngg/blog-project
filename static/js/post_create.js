document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.updateNavAuth === "function") window.updateNavAuth();

  // Elements
  const form = document.getElementById("create-post-form");
  const banner = document.getElementById("pc-banner");
  const tagsSearch = document.getElementById("tags-search");
  const tagsDropdown = document.getElementById("tags-dropdown");
  const tagsSelectedContainer = document.getElementById("tags-selected");
  const tplBlock = document.getElementById("tpl-block");
  const blocksList = document.getElementById("blocks-list");
  
  // Tags Picker State
  let allTags = [];
  let selectedTags = new Set();
  let blockCounter = 0;

  // Initialization
  loadCategories();
  loadTags();
  
  // Add first empty block
  addBlock();

  // Block management
  document.getElementById("btn-add-block").addEventListener("click", () => {
    addBlock();
  });

  // Tags Picker Logic
  tagsSearch.addEventListener("focus", () => {
    tagsDropdown.classList.add("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!document.getElementById("field-tags").contains(e.target)) {
      tagsDropdown.classList.remove("open");
    }
  });

  tagsSearch.addEventListener("input", (e) => {
    renderTagsDropdown(e.target.value);
  });

  // Title character count
  const titleInput = document.getElementById("post-title");
  const titleCount = document.getElementById("title-count");
  titleInput.addEventListener("input", () => {
    titleCount.textContent = titleInput.value.length;
    if (titleInput.value.length > 0) {
      document.getElementById("err-title").textContent = "";
      titleInput.classList.remove("pc-input--error");
    }
  });

  // Form Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner();
    clearErrors();

    const title = titleInput.value.trim();
    const categoryId = document.getElementById("post-category").value;
    
    let hasError = false;

    if (!title) {
      showFieldError("title", "Title is required.");
      hasError = true;
    }
    if (!categoryId) {
      showFieldError("category", "Category is required.");
      hasError = true;
    }

    // Process blocks
    const blockEls = document.querySelectorAll(".pc-block");
    const content = [];
    
    let isUploading = false;

    blockEls.forEach((block) => {
      const activePill = block.querySelector(".pc-type-pill--active");
      if (!activePill) return;
      const activeType = activePill.dataset.type;
      
      if (activeType === "paragraph") {
        const text = block.querySelector(".pc-block-textarea").value.trim();
        if (text) {
          content.push({
            type: "paragraph",
            data: { text }
          });
        }
      } else if (activeType === "heading") {
        const text = block.querySelector(".pc-heading-text").value.trim();
        const level = parseInt(block.querySelector(".pc-heading-level").value);
        if (text) {
          content.push({
            type: "heading",
            data: { text, level }
          });
        }
      } else if (activeType === "image") {
        const dropzone = block.querySelector(".pc-dropzone");
        const fileId = dropzone.dataset.fileId;
        const state = dropzone.dataset.state;
        
        if (state === "uploading") {
          isUploading = true;
        } else if (state === "uploaded" && fileId) {
          const caption = block.querySelector(".pc-image-caption").value.trim();
          const alignment = block.querySelector(".pc-image-align").value;
          content.push({
            type: "image",
            data: {
              file_id: parseInt(fileId),
              caption: caption,
              alignment: alignment
            }
          });
        }
      }
    });

    if (isUploading) {
      showBanner("Please wait for all images to finish uploading.", "error");
      return;
    }

    if (content.length === 0) {
      document.getElementById("err-content").textContent = "Add at least one content block with content.";
      hasError = true;
    }

    if (hasError) return;

    // Disable submit
    const btnSubmit = document.getElementById("btn-submit");
    const btnLabel = document.getElementById("btn-submit-label");
    const btnSpinner = document.getElementById("btn-submit-spinner");
    
    btnSubmit.disabled = true;
    btnLabel.style.display = "none";
    btnSpinner.style.display = "inline-block";

    const payload = {
      title,
      category: parseInt(categoryId),
      tags: Array.from(selectedTags),
      content
    };

    try {
      const res = await fetchApi("/posts/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showBanner("Post created successfully!", "ok");
        setTimeout(() => {
          window.location.href = `/post/${res.data.id}/`;
        }, 1000);
      } else {
        const userMessage = res.data?.message || res.data?.detail || "Cannot create post.";
        showBanner(`Error: ${userMessage}`, "error");
        btnSubmit.disabled = false;
        btnLabel.style.display = "inline-block";
        btnSpinner.style.display = "none";
      }
    } catch (err) {
      showBanner(`Network error: ${err.message}`, "error");
      btnSubmit.disabled = false;
      btnLabel.style.display = "inline-block";
      btnSpinner.style.display = "none";
    }
  });

  // Helper functions
  function showBanner(message, type) {
    banner.textContent = message;
    banner.className = `pc-banner pc-banner--${type}`;
    banner.style.display = "block";
  }

  function hideBanner() {
    banner.style.display = "none";
  }

  function showFieldError(field, message) {
    document.getElementById(`err-${field}`).textContent = message;
    const input = document.getElementById(`post-${field}`);
    if (input) input.classList.add("pc-input--error");
  }

  function clearErrors() {
    document.querySelectorAll(".pc-field__error").forEach(el => el.textContent = "");
    document.querySelectorAll(".pc-input--error").forEach(el => el.classList.remove("pc-input--error"));
  }

  async function loadCategories() {
    try {
      const res = await fetchApi("/categories/");
      if (res.ok && Array.isArray(res.data)) {
        const select = document.getElementById("post-category");
        select.innerHTML =
          `<option value="">— Select a category —</option>` +
          res.data
            .map(
              (cat) =>
                `<option value="${escapeHtml(String(cat.id))}">${escapeHtml(cat.name)}</option>`,
            )
            .join("");
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  async function loadTags() {
    try {
      const res = await fetchApi("/tags/");
      if (res.ok && Array.isArray(res.data)) {
        allTags = res.data;
        renderTagsDropdown();
      } else {
        document.getElementById("tags-loading").textContent = "Failed to load tags.";
      }
    } catch (err) {
      console.error("Failed to load tags:", err);
      document.getElementById("tags-loading").textContent = "Network error loading tags.";
    }
  }

  function renderTagsDropdown(query = "") {
    if (!allTags.length) return;
    
    const lowerQuery = query.toLowerCase();
    const filteredTags = allTags.filter(t => t.name.toLowerCase().includes(lowerQuery));
    
    if (filteredTags.length === 0) {
      tagsDropdown.innerHTML = `<div class="pc-tags-loading">No tags found.</div>`;
      return;
    }

    tagsDropdown.innerHTML = filteredTags.map(tag => {
      const isChecked = selectedTags.has(tag.id) ? "checked" : "";
      const safeName = escapeHtml(tag.name);
      const safeId = escapeHtml(tag.id);
      return `
        <label class="pc-tag-option">
          <input type="checkbox" value="${safeId}" data-name="${safeName}" ${isChecked} onchange="window.toggleTag(this)" />
          <span>${safeName}</span>
        </label>
      `;
    }).join("");
  }

  window.toggleTag = function(checkbox) {
    const id = parseInt(checkbox.value);
    const name = checkbox.dataset.name;
    
    if (checkbox.checked) {
      selectedTags.add(id);
    } else {
      selectedTags.delete(id);
    }
    
    renderSelectedTags();
  };

  window.removeTag = function(id) {
    selectedTags.delete(id);
    renderSelectedTags();
    // Update checkbox in dropdown if visible
    const cb = tagsDropdown.querySelector(`input[value="${id}"]`);
    if (cb) cb.checked = false;
  };

  function renderSelectedTags() {
    if (selectedTags.size === 0) {
      tagsSelectedContainer.innerHTML = "";
      return;
    }
    
    const html = Array.from(selectedTags).map(id => {
      const tag = allTags.find(t => t.id === id);
      if (!tag) return "";
      const safeName = escapeHtml(tag.name);
      return `
        <span class="pc-tag-pill">
          ${safeName}
          <button type="button" class="pc-tag-pill__remove" onclick="window.removeTag(${tag.id})" aria-label="Remove tag ${safeName}">&times;</button>
        </span>
      `;
    }).join("");
    
    tagsSelectedContainer.innerHTML = html;
  }

  // ── Block Management ──
  function addBlock() {
    const clone = tplBlock.content.cloneNode(true);
    const blockEl = clone.querySelector(".pc-block");
    blockEl.dataset.blockIndex = ++blockCounter;

    // Type pills logic
    const typePills = blockEl.querySelectorAll(".pc-type-pill");
    typePills.forEach(pill => {
      pill.addEventListener("click", function() {
        // Deactivate all
        typePills.forEach(p => p.classList.remove("pc-type-pill--active"));
        this.classList.add("pc-type-pill--active");
        
        // Hide all bodies
        blockEl.querySelectorAll(".pc-block__body").forEach(body => {
          body.style.display = "none";
        });
        
        // Show active body
        const type = this.dataset.type;
        blockEl.querySelector(`.pc-block__body--${type}`).style.display = "block";
      });
    });

    // Control buttons
    blockEl.querySelector(".pc-ctrl-btn--remove").addEventListener("click", () => {
      blockEl.remove();
    });
    
    blockEl.querySelector(".pc-ctrl-btn--up").addEventListener("click", () => {
      if (blockEl.previousElementSibling) {
        blockEl.parentNode.insertBefore(blockEl, blockEl.previousElementSibling);
      }
    });

    blockEl.querySelector(".pc-ctrl-btn--down").addEventListener("click", () => {
      if (blockEl.nextElementSibling) {
        blockEl.parentNode.insertBefore(blockEl.nextElementSibling, blockEl);
      }
    });

    // Dropzone logic for image blocks
    setupDropzone(blockEl.querySelector(".pc-dropzone"));

    // Auto-resize textarea
    const textarea = blockEl.querySelector(".pc-block-textarea");
    textarea.addEventListener("input", function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });

    blocksList.appendChild(clone);
  }

  function setupDropzone(dropzone) {
    const input = dropzone.querySelector(".pc-dropzone__input");
    const idleView = dropzone.querySelector(".pc-dropzone__idle");
    const previewView = dropzone.querySelector(".pc-dropzone__preview");
    const imgPreview = dropzone.querySelector(".pc-dropzone__img");
    const filenameLabel = dropzone.querySelector(".pc-dropzone__filename");
    const btnRemove = dropzone.querySelector(".pc-dropzone__remove");
    const uploadStatus = dropzone.querySelector(".pc-upload-status");
    const uploadFill = dropzone.querySelector(".pc-upload-fill");
    const uploadLabel = dropzone.querySelector(".pc-upload-label");
    const errorMsg = dropzone.querySelector(".pc-dropzone__error");

    const btnBrowse = dropzone.querySelector(".pc-dropzone__browse");
    btnBrowse.addEventListener("click", (e) => {
      e.stopPropagation();
      input.click();
    });

    dropzone.addEventListener("click", (e) => {
      if (dropzone.dataset.state === "idle") {
        input.click();
      }
    });

    imgPreview.addEventListener('load', () => {
      if (imgPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(imgPreview.src);
      }
    });

    imgPreview.addEventListener('error', () => {
      if (imgPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(imgPreview.src);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        if (dropzone.dataset.state === "idle") dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'));
    });

    dropzone.addEventListener('drop', (e) => {
      if (dropzone.dataset.state !== "idle") return;
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length) {
        handleFile(files[0]);
      }
    });

    input.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        handleFile(this.files[0]);
      }
    });

    btnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      resetDropzone();
    });

    function resetDropzone() {
      if (imgPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(imgPreview.src);
      }
      input.value = "";
      dropzone.dataset.state = "idle";
      dropzone.dataset.fileId = "";
      imgPreview.src = "";
      filenameLabel.textContent = "";
      idleView.style.display = "block";
      previewView.style.display = "none";
      errorMsg.style.display = "none";
    }

    async function handleFile(file) {
      if (!file.type.startsWith("image/")) {
        showDropzoneError("Only image files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showDropzoneError("File size exceeds 5MB limit.");
        return;
      }

      errorMsg.style.display = "none";
      dropzone.dataset.state = "uploading";
      idleView.style.display = "none";
      previewView.style.display = "block";
      
      filenameLabel.textContent = file.name;
      if (imgPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(imgPreview.src);
      }
      imgPreview.src = URL.createObjectURL(file);
      
      uploadStatus.style.display = "block";
      uploadFill.style.width = "30%";
      uploadLabel.textContent = "Uploading...";
      btnRemove.style.display = "none";

      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await fetchApi("/files/upload/", {
          method: "POST",
          body: formData,
        });

        const data = res.data;

        if (res.ok) {
          uploadFill.style.width = "100%";
          uploadLabel.textContent = "Upload complete";
          dropzone.dataset.state = "uploaded";
          dropzone.dataset.fileId = data.id;
          
          setTimeout(() => {
            uploadStatus.style.display = "none";
            btnRemove.style.display = "inline-flex";
          }, 500);
        } else {
          throw new Error(data.detail || "Upload failed");
        }

      } catch (err) {
        showDropzoneError(`Upload error: ${err.message}`);
        resetDropzone();
      }
    }

    function showDropzoneError(msg) {
      errorMsg.textContent = msg;
      errorMsg.style.display = "block";
    }
  }

});
