from django.urls import path 
from .views import RegisterView, LoginView, LogoutView, CurrentUserView, LikedPostsView, BookmarkedPostsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
]

me_urlpatterns = [
    path('liked/', LikedPostsView.as_view(), name='me-liked'),
    path('bookmarks/', BookmarkedPostsView.as_view(), name='me-bookmarks'),
]