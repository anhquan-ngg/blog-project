from django.urls import path
from .views import TagListCreateView, TagDetailUpdateDeleteView

urlpatterns = [
    path('', TagListCreateView.as_view(), name='tag-list-create'),
    path('<int:pk>/', TagDetailUpdateDeleteView.as_view(), name='tag-detail-update-delete'),
]
