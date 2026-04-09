from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAuthorOrAdmin(BasePermission):
    """
    Allow safe methods(GET, HEAD, OPTIONS) access to anyone, but only allow other methods to the author or an admin.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user and request.user.is_staff:
            return True
        return obj.author == request.user
    
class IsAuthorOnly(BasePermission):
    """
    Allow only the author to access the object. (for UC Update post)
    """
    def has_object_permission(self, request, view, obj):
        return obj.author == request.user