from django.urls import path
from .views import CommentUpdateDeleteAPIView

urlpatterns = [
    path('<int:pk>/', CommentUpdateDeleteAPIView.as_view(), name='comment-update-delete'),
]
