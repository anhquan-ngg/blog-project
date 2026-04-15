from apps.admin.views.user_views import UnbanUserView
from django.urls.conf import path
from apps.admin.views.user_views import BanUserView

urlpatterns = [
    path('users/<int:pk>/ban/', BanUserView.as_view(), name='ban_user'),
    path('users/<int:pk>/unban/', UnbanUserView.as_view(), name='unban_user')
]