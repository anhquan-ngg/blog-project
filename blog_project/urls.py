from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)
import sys
import os

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/', include('apps.categories.urls')),
    path('api/files/', include('apps.files.urls')),
    path('api/posts/', include('apps.posts.urls')),

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