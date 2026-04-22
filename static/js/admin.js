document.addEventListener('DOMContentLoaded', () => {
    switchAdminTab('dashboard');
});

const usersPagination = {
    limit: 10,
    offset: 0,
    count: 0,
    hasNext: false,
    hasPrevious: false
};

const postsPagination = {
    limit: 10,
    offset: 0,
    count: 0,
    hasNext: false,
    hasPrevious: false
};

function switchAdminTab(tabId) {
    const tabs = ['dashboard', 'categories', 'users', 'posts'];
    
    // Hide all
    tabs.forEach(t => {
        const el = document.getElementById(`admin-${t}`);
        if(el) el.style.display = 'none';
        
        const navLink = document.querySelector(`a[href="#${t}"]`);
        if(navLink) navLink.classList.remove('active');
    });

    // Show active
    const activeEl = document.getElementById(`admin-${tabId}`);
    const activeNav = document.querySelector(`a[href="#${tabId}"]`);
    
    if(activeEl) activeEl.style.display = 'block';
    if(activeNav) activeNav.classList.add('active');

    // Load data based on tab
    if (tabId === 'dashboard') loadDashboard();
    if (tabId === 'categories') loadCategoriesAdmin();
    if (tabId === 'users') loadUsersAdmin();
    if (tabId === 'posts') loadPostsAdmin();
}

// ---------------- DASHBOARD ----------------
async function loadDashboard() {
    const resUsers = await fetchApi('/admin/users/');
    const resCategories = await fetchApi('/categories/');
    const resPosts = await fetchApi('/posts/');

    document.getElementById('stat-users').textContent = resUsers.ok ? `${resUsers.data.count || 0} Users` : 'Error';
    document.getElementById('stat-categories').textContent = resCategories.ok ? `${resCategories.data.count || resCategories.data.length} Categories` : 'Error';
    document.getElementById('stat-posts').textContent = resPosts.ok ? `${resPosts.data.count || 0} Posts` : 'Error';
}

// ---------------- CATEGORIES ----------------
async function loadCategoriesAdmin() {
    const tbody = document.getElementById('categories-table-body');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    const res = await fetchApi('/categories/');
    if (res.ok) {
        bindCategoryTableActions();
        tbody.innerHTML = res.data.map(cat => `
            <tr>
                <td>${cat.id}</td>
                <td>${cat.name}</td>
                <td>
                    <button class="btn btn-outline js-category-edit" data-id="${cat.id}" data-name="${encodeURIComponent(cat.name)}" style="padding: 6px 12px; border-radius: 30px;">Edit</button>
                    <button class="btn btn-outline js-category-delete" data-id="${cat.id}" style="padding: 6px 12px; border-radius: 30px; color: #D30005; border-color: #D30005;">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

function bindCategoryTableActions() {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody || tbody.dataset.bound === 'true') return;

    tbody.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.classList.contains('js-category-edit')) {
            const id = Number(target.dataset.id);
            if (!Number.isInteger(id)) return;
            const name = decodeURIComponent(target.dataset.name || '');
            editCategory(id, name);
            return;
        }

        if (target.classList.contains('js-category-delete')) {
            const id = Number(target.dataset.id);
            if (!Number.isInteger(id)) return;
            deleteCategory(id);
        }
    });

    tbody.dataset.bound = 'true';
}

async function createCategory() {
    const name = prompt("Enter new Category name:");
    if (!name) return;
    
    const res = await fetchApi(`/categories/`, {
        method: 'POST',
        body: JSON.stringify({ name: name })
    });

    if (res.ok) loadCategoriesAdmin();
    else alert('Error: ' + JSON.stringify(res.data));
}

async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    const res = await fetchApi(`/categories/${id}/`, { method: 'DELETE' });
    if (res.ok) loadCategoriesAdmin();
    else alert('Error deleting category');
}

async function editCategory(id, oldName) {
    const name = prompt("Enter new Category name (edit)", oldName);
    if (!name) return;
    
    const res = await fetchApi(`/categories/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({ name: name})
    });

    if (res.ok) loadCategoriesAdmin();
    else alert('Error editing category');
}

// ---------------- USERS ----------------
function renderUsersPagination() {
    const pageInfo = document.getElementById('users-page-info');
    const prevBtn = document.getElementById('users-prev-btn');
    const nextBtn = document.getElementById('users-next-btn');

    if (!pageInfo || !prevBtn || !nextBtn) return;

    const currentPage = Math.floor(usersPagination.offset / usersPagination.limit) + 1;
    const totalPages = Math.max(1, Math.ceil(usersPagination.count / usersPagination.limit));
    pageInfo.textContent = `Page ${currentPage} / ${totalPages} (${usersPagination.count} users)`;

    prevBtn.disabled = !usersPagination.hasPrevious;
    nextBtn.disabled = !usersPagination.hasNext;
}

function goToPreviousUsersPage() {
    if (!usersPagination.hasPrevious) return;
    usersPagination.offset = Math.max(0, usersPagination.offset - usersPagination.limit);
    loadUsersAdmin(usersPagination.offset);
}

function goToNextUsersPage() {
    if (!usersPagination.hasNext) return;
    usersPagination.offset = usersPagination.offset + usersPagination.limit;
    loadUsersAdmin(usersPagination.offset);
}

async function loadUsersAdmin(offset = 0) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    const res = await fetchApi(`/admin/users/?limit=${usersPagination.limit}&offset=${offset}`);
    if (res.ok) {
        usersPagination.offset = offset;
        usersPagination.count = Number(res.data.count || 0);
        usersPagination.hasNext = Boolean(res.data.next);
        usersPagination.hasPrevious = Boolean(res.data.previous);

        if (!Array.isArray(res.data.results) || res.data.results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No users found.</td></tr>';
            renderUsersPagination();
            return;
        }

        tbody.innerHTML = res.data.results.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.first_name}</td>
                <td>${user.last_name}</td>
                <td>${user.is_staff ? 'Yes' : 'No'}</td>
                <td>
                    <span class="${user.is_active ? 'badge-gray' : 'badge-red'}">
                        ${user.is_active ? 'Active' : 'Banned'}
                    </span>
                </td>
                <td>
                    ${user.is_active 
                        ? `<button class="btn btn-outline" style="padding: 6px 12px; border-radius: 30px; color: #D30005; border-color: #D30005;" onclick="banUser(${user.id})">Ban</button>`
                        : `<button class="btn btn-outline" style="padding: 6px 12px; border-radius: 30px;" onclick="unbanUser(${user.id})">Unban</button>`
                    }
                </td>
            </tr>
        `).join('');

        renderUsersPagination();
    } else {
        tbody.innerHTML = '<tr><td colspan="8">Cannot load users.</td></tr>';
    }
}

async function banUser(id) {
    if (!confirm('Do you really want to BAN this user?')) return;
    const res = await fetchApi(`/admin/users/${id}/ban/`, { method: 'POST', body: JSON.stringify({reason: 'Vi pham'}) });
    if (res.ok) loadUsersAdmin(usersPagination.offset);
    else alert('Cannot Ban');
}

async function unbanUser(id) {
    if (!confirm('Do you really want to UNBAN this user?')) return;
    const res = await fetchApi(`/admin/users/${id}/unban/`, { method: 'POST' });
    if (res.ok) loadUsersAdmin(usersPagination.offset);
    else alert('Cannot Unban');
}

// ---------------- POSTS ----------------
function renderPostsPagination() {
    // Similar to renderUsersPagination but for posts
    const pageInfo = document.getElementById('posts-page-info');
    const prevBtn = document.getElementById('posts-prev-btn');
    const nextBtn = document.getElementById('posts-next-btn');

    if (!pageInfo || !prevBtn || !nextBtn) return;

    const currentPage = Math.floor(postsPagination.offset / postsPagination.limit) + 1;
    const totalPages = Math.max(1, Math.ceil(postsPagination.count / postsPagination.limit));
    pageInfo.textContent = `Page ${currentPage} / ${totalPages} (${postsPagination.count} posts)`;

    prevBtn.disabled = !postsPagination.hasPrevious;
    nextBtn.disabled = !postsPagination.hasNext;
}

function goToPreviousPostsPage() {
    if (!postsPagination.hasPrevious) return;
    postsPagination.offset = Math.max(0, postsPagination.offset - postsPagination.limit);
    loadPostsAdmin(postsPagination.offset);
}

function goToNextPostsPage() {
    if (!postsPagination.hasNext) return;
    postsPagination.offset = postsPagination.offset + postsPagination.limit;
    loadPostsAdmin(postsPagination.offset);
}

async function loadPostsAdmin(offset = 0) {
    const tbody = document.getElementById('posts-table-body');
    tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

    const res = await fetchApi(`/posts/?limit=${postsPagination.limit}&offset=${offset}`);
    if (res.ok) {
        postsPagination.offset = offset;
        postsPagination.count = Number(res.data.count || 0);
        postsPagination.hasNext = Boolean(res.data.next);
        postsPagination.hasPrevious = Boolean(res.data.previous);

        if (postsPagination.count > 0 && postsPagination.offset >= postsPagination.count) {
            const lastOffset = Math.max(0, (Math.ceil(postsPagination.count / postsPagination.limit) - 1) * postsPagination.limit);
            return loadPostsAdmin(lastOffset);
        }

        if (!Array.isArray(res.data.results) || res.data.results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No posts found.</td></tr>';
            renderPostsPagination();
            return;
        }

        tbody.innerHTML = res.data.results.map(post => `
            <tr>
                <td>${post.id}</td>
                <td>${post.title}</td>
                <td>${post.author?.username || '-'}</td>
                <td>${post.category?.name || '-'}</td>
                <td>${post.likes_count}</td>
                <td>${post.bookmarks_count}</td>
                <td>${new Date(post.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 6px 12px; border-radius: 30px; color: #D30005; border-color: #D30005;" onclick="deletePost(${post.id})">Delete</button>
                </td>
            </tr>
        `).join('');

        renderPostsPagination();
    } else {
        tbody.innerHTML = '<tr><td colspan="8">Cannot load posts.</td></tr>';
    }
}

async function deletePost(id) {
    if (!confirm('Do you really want to DELETE this post?')) return;
    const res = await fetchApi(`/posts/${id}/`, { method: 'DELETE' });
    if (res.ok) {
        loadPostsAdmin(postsPagination.offset);
    } else {
        alert('Cannot delete post');
    }
}


// ---------------- EXPORT / IMPORT ----------------
async function downloadFileWithAuth(endpoint, fallbackFilename) {
    const token = typeof getCookie === 'function' ? getCookie('auth_token') : null;
    const headers = {};
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'same-origin'
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Export failed.');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
    const filename = fileNameMatch ? fileNameMatch[1] : fallbackFilename;

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
}

async function exportUsers() {
    try {
        await downloadFileWithAuth('/admin/users/export/', 'users-export.csv');
    } catch (err) {
        alert(`Export users failed: ${err.message}`);
    }
}

async function exportPosts() {
    try {
        await downloadFileWithAuth('/admin/posts/export/', 'posts-export.csv');
    } catch (err) {
        alert(`Export posts failed: ${err.message}`);
    }
}

function pickFile(accept = '.csv') {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';

        input.addEventListener('change', () => {
            const selectedFile = input.files && input.files.length ? input.files[0] : null;
            input.remove();
            resolve(selectedFile);
        }, { once: true });

        document.body.appendChild(input);
        input.click();
    });
}

async function importByFile(endpoint, file, successMessage) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchApi(endpoint, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const detail = res.data?.file?.[0] || res.data?.detail || 'Import failed.';
        throw new Error(detail);
    }

    alert(successMessage);
    return res.data;
}

async function importUsers() {
    try {
        const file = await pickFile('.csv,text/csv');
        if (!file) return;

        await importByFile('/admin/users/import/', file, 'Import users thành công.');
        loadUsersAdmin(usersPagination.offset);
        loadDashboard();
    } catch (err) {
        alert(`Import users failed: ${err.message}`);
    }
}

async function importPosts() {
    try {
        const file = await pickFile('.csv,text/csv');
        if (!file) return;

        await importByFile('/admin/posts/import/', file, 'Import posts thành công.');
        loadPostsAdmin(postsPagination.offset);
        loadDashboard();
    } catch (err) {
        alert(`Import posts failed: ${err.message}`);
    }
}
