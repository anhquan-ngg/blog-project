document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.updateNavAuth === "function") window.updateNavAuth();
    loadProfile();
    loadNotifications();

    document.getElementById('btn-logout').addEventListener('click', async () => {
        const res = await fetchApi('/auth/logout/', { method: 'POST' });
        if (res.ok) {
            window.location.href = '/';
        } else {
            alert('Logout error');
        }
    });
});

function formatNotificationText(notification) {
    const actor = notification.actor_username || 'Someone';
    if (notification.type === 'liked_post') return `${actor} liked your post.`;
    if (notification.type === 'commented_post') return `${actor} commented on your post.`;
    if (notification.type === 'replied_comment') return `${actor} replied to your comment.`;
    return `${actor} sent you a notification.`;
}

async function loadProfile() {
    const res = await fetchApi('/auth/me/');
    if (res.ok) {
        document.getElementById('profile-name').textContent = res.data.username;
        document.getElementById('profile-email').textContent = res.data.email;
    }
}

async function loadNotifications() {
    const res = await fetchApi('/notifications/?limit=20');
    if (res.ok) {
        const container = document.getElementById('notifications-list');
        
        if (!res.data.results || res.data.results.length === 0) {
            container.innerHTML = '<p class="muted">No new notifications.</p>';
            return;
        }

        container.innerHTML = res.data.results.map(n => `
            <button type="button" class="notif-item ${n.is_read ? 'notif-read' : 'notif-unread'}" onclick="markRead(${n.id}, this)">
                <span>${formatNotificationText(n)}</span>
                <span class="text-xs muted">${new Date(n.created_at).toLocaleString('vi-VN')}</span>
            </button>
        `).join('');
    }
}

async function markRead(id, element) {
    if (element.classList.contains('notif-read')) return;
    const res = await fetchApi(`/notifications/${id}/read/`, { method: 'PATCH' });
    if (res.ok) {
        element.classList.remove('notif-unread');
        element.classList.add('notif-read');

        if (window.notificationDropdown && typeof window.notificationDropdown.refresh === 'function') {
            window.notificationDropdown.refresh();
        }
    }
}