document.addEventListener('DOMContentLoaded', () => {
    const tabLiked = document.getElementById('tab-liked');
    const tabBookmarks = document.getElementById('tab-bookmarks');
    let currentTab = 'liked';

    // Start
    loadLibrary(currentTab);

    tabLiked.addEventListener('click', (e) => {
        e.preventDefault();
        currentTab = 'liked';
        updateTabs(tabLiked, tabBookmarks);
        loadLibrary(currentTab);
    });

    tabBookmarks.addEventListener('click', (e) => {
        e.preventDefault();
        currentTab = 'bookmarks';
        updateTabs(tabBookmarks, tabLiked);
        loadLibrary(currentTab);
    });
});

function updateTabs(active, inactive) {
    active.classList.add('active');
    inactive.classList.remove('active');
}

async function loadLibrary(type) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('library-grid');
    
    loading.style.display = 'block';
    grid.innerHTML = '';

    const endpoint = type === 'liked' ? '/posts/liked/' : '/posts/bookmarked/'; 
    try {
        const res = await fetchApi(endpoint);
        loading.style.display = 'none';

        if (res.ok) {
            const posts = res.data.results || [];
            
            if (posts.length === 0) {
                grid.innerHTML = `<h3 class="muted" style="grid-column: 1/-1; text-align: center;">No posts in library yet.</h3>`;
            } else {
                grid.innerHTML = posts.map(post => `
                    <article class="post-card">
                        <a href="/post/${encodeURIComponent(post.slug || post.id)}/">
                            <div class="post-img-cover">
                                <div class="placeholder-img" style="background:#f5f5f5; width:100%; aspect-ratio:1/1;"></div>
                            </div>
                        </a>
                        <div class="post-meta">
                            <a href="/post/${encodeURIComponent(post.slug || post.id)}/">
                                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                            </a>
                            <p class="post-desc muted">${escapeHtml(post.excerpt) || '...'}</p>
                            <p class="post-date text-xs">${new Date(post.created_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                    </article>
                `).join('');
            }
        } else {
            grid.innerHTML = `<h3 class="error" style="grid-column: 1/-1; text-align: center;">An error occurred while loading the library.</h3>`;
        }   
    } catch (error) {
        loading.style.display = 'none';
        console.error("Error fetching library data:", error);

    }
}