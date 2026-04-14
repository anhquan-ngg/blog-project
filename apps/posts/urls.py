from django.urls import path, include
from .views import PostListCreateView, PostDetailUpdateDeleteView, PostRelatedView, PostSearchView

urlpatterns = [
    path('', PostListCreateView.as_view(), name='post-list-create'),
    path('search/', PostSearchView.as_view(), name='post-search'),
    path('<int:pk>/', PostDetailUpdateDeleteView.as_view(), name='post-detail-update-delete'),
    path('<int:pk>/related/', PostRelatedView.as_view(), name='post-related'),
    path('<int:pk>/comments/', include('apps.comments.urls')),
]