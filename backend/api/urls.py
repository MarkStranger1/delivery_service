"""
Определяет маршрутизацию URL для операций:
    - пользователя;
    - ...;

Маршруты:
    - /users: операции с пользователями;
    - ...;
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()

router.register("users", views.UserViewSet, basename="users")
router.register('ingredients', views.IngredientViewSet, basename='ingredients')
router.register('types', views.TypeViewSet, basename='types')
router.register('dishes', views.DishViewSet, basename='dishes')
router.register('orders', views.OrderViewSet, basename='orders')
router.register('orders/payment', views.OrderViewSet, basename='payment')
router.register('orders/history', views.OrderViewSet, basename='history')

urlpatterns = [
    path("", include(router.urls)),
    path(r"auth/", include("djoser.urls")),
    path(r"auth/", include("djoser.urls.authtoken")),
]
