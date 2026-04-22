document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateNavAuth === "function") updateNavAuth();
    
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    const catSelect = document.getElementById('filter-category');
    const sortSelect = document.getElementById('sort-order');

    // Run initial search
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    const category = urlParams.get('category') || '';
    const ordering = urlParams.get('ordering') || '-created_at';
    
    if (query) {
        input.value = query;
    }
    
    // We need to wait for categories to load before applying the category value
    loadCategories(category).then(() => {
        sortSelect.value = ordering;
        performSearch(query, category, ordering);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        updateURLAndSearch();
    });

    catSelect.addEventListener('change', updateURLAndSearch);
    sortSelect.addEventListener('change', updateURLAndSearch);

    function updateURLAndSearch() {
        const q = input.value.trim();
        const categoryVal = catSelect.value;
        const sortVal = sortSelect.value;

        // Update URL to make it shareable
        const searchParams = new URLSearchParams();
        if(q) searchParams.set('q', q);
        if(categoryVal) searchParams.set('category', categoryVal);
        if(sortVal && sortVal !== '-created_at') searchParams.set('ordering', sortVal);
        
        const newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
        history.pushState(null, '', newRelativePathQuery);

        performSearch(q, categoryVal, sortVal);
    }
});

async function loadCategories(selectedCategory = '') {
    const res = await fetchApi('/categories/');
    if (res.ok) {
        const select = document.getElementById('filter-category');
        select.innerHTML += res.data.map(cat => 
            `<option value="${cat.id}">${escapeHtml(cat.name).toUpperCase()}</option>`
        ).join('');
        if (selectedCategory) {
            select.value = selectedCategory;
        }
    }
}

async function performSearch(query, categoryId, ordering) {
    const loading = document.getElementById('loading');
    const resultsContainer = document.getElementById('search-results');
    const countSpan = document.getElementById('result-count');

    loading.style.display = 'block';
    resultsContainer.innerHTML = '';
    countSpan.textContent = '';

    // Build URL endpoint
    let url = '';
    
    // If we have a valid search query, use search endpoint, otherwise use standard posts endpoint
    if (query && query.trim().length >= 2) {
        url = `/posts/search/?q=${encodeURIComponent(query.trim())}&`;
        if (categoryId) url += `category=${categoryId}&`;
        // Note: search endpoint might ignore ordering and default to rank, but we pass it anyway or handle it
        // Depending on backend, ordering on search might not be supported natively, but we can pass it
        if (ordering) url += `ordering=${ordering}&`;
    } else {
        url = `/posts/?`;
        if (categoryId) url += `category=${categoryId}&`;
        if (ordering) url += `ordering=${ordering}&`;
        // if user typed 1 char and it was ignored, maybe we just list posts.
    }

    const res = await fetchApi(url);
    
    loading.style.display = 'none';

    if (res.ok) {
        const posts = res.data.results || [];
        const count = res.data.count || 0;
        
        countSpan.textContent = `(${count} results)`;

        if (posts.length === 0) {
            resultsContainer.innerHTML = `<h3 class="muted" style="grid-column: 1/-1; text-align: center;">No matching posts found.</h3>`;
        } else {
            resultsContainer.innerHTML = posts.map(post => `
                <article class="post-card">
                    <a href="/post/${post.slug || post.id}/">
                        <div class="post-img-cover">
                            <div class="placeholder-img" style="background:#f5f5f5; width:100%; aspect-ratio:1/1;"></div>
                        </div>
                    </a>
                    <div class="post-meta">
                        <a href="/post/${post.slug || post.id}/">
                            <h3 class="post-title">${escapeHtml(post.title)}</h3>
                        </a>
                        <p class="post-desc muted">${escapeHtml(post.excerpt || (post.content && typeof post.content === 'string' ? post.content.substring(0, 100) : 'Post details...'))}</p>
                        <p class="post-date text-xs">${new Date(post.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                </article>
            `).join('');        }
    } else {
        resultsContainer.innerHTML = `<h3 class="error" style="grid-column: 1/-1; text-align: center;">An error occurred while searching.</h3>`;
    }
}