from django.urls import path
from .views import NotificationsListView, NotificationReadView

urlpatterns = [
    path('', NotificationsListView.as_view(), name='notifications-list'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
]