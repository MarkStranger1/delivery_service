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
router.register(r'orders/cart', views.OrderCartViewSet, basename='orders-cart')
router.register(r'orders/history', views.OrderHistoryViewSet, basename='history')
router.register(r'orders/active', views.OrderActiveViewSet, basename='active')
router.register(r'deliveryaddress', views.UserDeliveryAddressViewSet, basename="deliveryaddress")

router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'couriers', views.CourierViewSet, basename='couriers')

urlpatterns = [
    path("users/me", views.UserSelfUpdateView.as_view(), name="user-self-update"),
    path("", include(router.urls)),
    path(r"auth/", include("djoser.urls")),
    path(r"auth/", include("djoser.urls.authtoken")),
]
