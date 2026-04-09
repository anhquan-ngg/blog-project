from django.urls import path
from .views import PostListCreateView, PostDetailUpdateDeleteView, PostRelatedView

urlpatterns = [
    path('', PostListCreateView.as_view(), name='post-list-create'),
    path('<int:pk>/', PostDetailUpdateDeleteView.as_view(), name='post-detail-update-delete'),
    path('<int:pk>/related/', PostRelatedView.as_view(), name='post-related'),
]