from apps.admin.views.user_views import ExportUsersToCSVView, UnbanUserView, ImportUsersFromCSVView
from django.urls.conf import path
from apps.admin.views.user_views import BanUserView

urlpatterns = [
    path('users/<int:pk>/ban/', BanUserView.as_view(), name='ban_user'),
    path('users/<int:pk>/unban/', UnbanUserView.as_view(), name='unban_user'),
    path('users/export/', ExportUsersToCSVView.as_view(), name='export_users'),
    path('users/import/', ImportUsersFromCSVView.as_view(), name='import_users'),
]