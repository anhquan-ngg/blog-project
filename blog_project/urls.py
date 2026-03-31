"""
URL configuration for blog_project project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from blog.views import UserViewSet, PostViewSet, CommentViewSet, RegisterView
from rest_framework.authtoken.views import obtain_auth_token

# Router chính
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'posts', PostViewSet, basename='post')

# Nested router: /posts/{post_pk}/comments/ và /posts/{post_pk}/comments/{pk}/
posts_router = nested_routers.NestedDefaultRouter(router, r'posts', lookup='post')
posts_router.register(r'comments', CommentViewSet, basename='post-comments')

urlpatterns = [
    # Tất cả URL của router chính (/, /users/, /posts/, ...)
    path('', include(router.urls)),

    # URL lồng nhau: /posts/{post_pk}/comments/
    path('', include(posts_router.urls)),

    # Admin site
    path('admin/', admin.site.urls),
    path('register/', RegisterView.as_view(), name='register'),
    path('api-auth/token/', obtain_auth_token, name='api_token_auth'),
    # DRF login/logout cho Browsable API
    path('api-auth/', include('rest_framework.urls')),
]