from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_staff
                or request.method in permissions.SAFE_METHODS)
