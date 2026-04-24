from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)
from blog_project.ui_views import (
    home_page, login_page, register_page, 
    post_detail_page, post_create_page, post_edit_page, 
    search_page, profile_page, library_page, admin_portal_page
)
from apps.users.urls import me_urlpatterns
import sys
import os

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_page, name='ui-home'),
    path('login/', login_page, name='ui-login'),
    path('register/', register_page, name='ui-register'),
    path('search/', search_page, name='ui-search'),
    path('profile/', profile_page, name='ui-profile'),
    path('library/', library_page, name='ui-library'),
    path('admin-portal/', admin_portal_page, name='ui-admin-portal'),
    path('post/create/', post_create_page, name='ui-post-create'),
    path('post/<int:pk>/edit/', post_edit_page, name='ui-post-edit'),
    path('post/<slug:slug>/', post_detail_page, name='ui-post-detail'),
    path('api/auth/', include('apps.users.urls')),
    path('api/me/', include(me_urlpatterns)),
    path('api/', include('apps.categories.urls')),
    path('api/files/', include('apps.files.urls')),
    path('api/posts/', include('apps.posts.urls')),
    path('api/comments/', include('apps.comments.urls_global')),
    path('api/tags/', include('apps.tags.urls')),
    path('api/admin/', include('apps.admin.urls')),
    path('api/notifications/', include('apps.notifications.urls')),

    # Schema & Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Chỉ in ra khi đang chạy câu lệnh "runserver" và chỉ in MỘT LẦN ở luồng chính (tránh bị double dòng)
if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') == 'true':
    print("\n" + "="*55)
    print("API DOCUMENTATION:")
    print("- Swagger UI : http://127.0.0.1:8000/api/docs/")
    print("- ReDoc UI   : http://127.0.0.1:8000/api/redoc/")
    print("="*55 + "\n")