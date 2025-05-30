"""
Содержит View-классы реализующие операции моделей:
    - User;
    - ...;

Модули:
    - UserViewSet;
    - ...
"""

from dish.models import Dish, Ingredient, Order, Type
from django_filters.rest_framework import DjangoFilterBackend
from djoser.views import UserViewSet as DjoserUserViewSet
from rest_framework import filters, mixins, status, viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.generics import RetrieveUpdateAPIView
from user.models import User, DeliveryAddress, UserDeliveryAddress

from .filters import DishFilter, IngredientFilter
from .permissions import IsAdminOrReadOnly
from .serializers import (DishReadSerializer, IngredientSerializer,
                          TypeSerializer, UserReadSerializer,
                          UserUpdateSerializer, OrderCartSerializer,
                          OrderCartUpdateSerializer, UserDeliveryAddressSerializer,
                          OrderActiveUpdateSerializer, OrderSerializer,
                          OrderUpdateSerializer, CourierSerializer)


class UserViewSet(DjoserUserViewSet):
    """View-класс для работы с пользователем"""

    serializer_class = UserReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Возвращает только текущего пользователя"""
        return User.objects.filter(id=self.request.user.id)


class UserSelfUpdateView(RetrieveUpdateAPIView):
    """Обновление данных текущего пользователя"""
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user  # Всегда возвращает текущего пользователя


class UserDeliveryAddressViewSet(viewsets.ModelViewSet):
    serializer_class = UserDeliveryAddressSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def get_queryset(self):
        return UserDeliveryAddress.objects.filter(user=self.request.user)

    def create(self, request):
        user = request.user
        address_text = request.data.get("delivery_address")
        is_default = request.data.get("is_default", False)

        if not address_text:
            return Response({"error": "Address is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Находим или создаем DeliveryAddress по адресу
        address_obj, _ = DeliveryAddress.objects.get_or_create(address=address_text)

        # Создаем запись UserDeliveryAddress
        user_address, created = UserDeliveryAddress.objects.get_or_create(
            user=user,
            delivery_address=address_obj,
            defaults={"is_default": is_default}
        )

        if not created:
            user_address.is_default = is_default
            user_address.save()

        return Response(self.get_serializer(user_address).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        address_id = kwargs.get("pk")

        user_address = UserDeliveryAddress.objects.filter(
            user=user, delivery_address_id=address_id
        ).first()

        if not user_address:
            return Response({"error": "Address not found."}, status=status.HTTP_404_NOT_FOUND)

        address_obj = user_address.delivery_address
        user_address.delete()

        if not UserDeliveryAddress.objects.filter(delivery_address=address_obj).exists():
            address_obj.delete()

        return Response({"message": "Address deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        user = request.user
        address_id = kwargs.get("pk")
        is_default = request.data.get("is_default")

        if is_default is None:
            return Response({"error": "Field 'is_default' is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_address = UserDeliveryAddress.objects.filter(
            user=user, delivery_address_id=address_id
        ).first()

        if not user_address:
            return Response({"error": "Address not found."}, status=status.HTTP_404_NOT_FOUND)

        if is_default:
            UserDeliveryAddress.objects.filter(user=user).update(is_default=False)

        user_address.is_default = is_default
        user_address.save()

        return Response(self.get_serializer(user_address).data, status=status.HTTP_200_OK)


class ListRetrieveViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """Mixins классов Tag и Ingredients."""
    pagination_class = None
    filter_backends = (filters.SearchFilter,)
    search_fields = ('name',)


class TypeViewSet(ListRetrieveViewSet):
    """View-класс реализующий операции модели Tag"""

    queryset = Type.objects.all()
    serializer_class = TypeSerializer


class IngredientViewSet(ListRetrieveViewSet):
    """View-класс реализующий операции модели Ingredient"""

    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filterset_class = IngredientFilter


class DishViewSet(viewsets.ModelViewSet):
    """View-класс реализующий операции модели Dish"""

    permission_classes = [IsAdminOrReadOnly]
    filter_backends = (filters.SearchFilter, DjangoFilterBackend,)
    search_fields = ('name',)
    filterset_class = DishFilter

    def get_queryset(self):
        return Dish.objects.all().order_by("id")

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DishReadSerializer


class OrderCartViewSet(viewsets.ModelViewSet):
    """ViewSet для управления заказами в корзине (ожидание оплаты)."""

    serializer_class = OrderCartSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch",
                         "put", "delete", "head", "options"]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user, status=Order.Status.awaiting_payment)

    def get_serializer_class(self):
        if self.request.method in ["PATCH", "PUT", "POST"]:
            return OrderCartUpdateSerializer
        return OrderCartSerializer

    def perform_create(self, serializer):
        """Создание нового заказа в корзине."""
        serializer.save(user=self.request.user,
                        status=Order.Status.awaiting_payment)


class OrderHistoryViewSet(viewsets.ModelViewSet):
    """ViewSet для управления заказами в истории."""

    serializer_class = OrderCartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Выбираем только заказы текущего пользователя у которых любой статус, кроме 'awaiting_payment'."""
        return Order.objects.filter(
            user=self.request.user,
            status__in=[Order.Status.delivered, Order.Status.deliver, Order.Status.cancelled]
        )


class OrderActiveViewSet(viewsets.ModelViewSet):
    """ViewSet для управления заказами в корзине (ожидание оплаты)."""

    serializer_class = OrderCartSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch",
                         "put", "delete", "head", "options"]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user,
            status__in=[Order.Status.awaiting_courier, Order.Status.deliver, Order.Status.awaiting_payment]
        )

    def get_serializer_class(self):
        if self.request.method in ["PATCH", "PUT", "POST"]:
            return OrderActiveUpdateSerializer
        return OrderCartSerializer


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet для заказов: просмотр и частичное обновление."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != User.Role.manager:
            raise PermissionDenied("Только менеджер может просматривать курьеров.")
        allowed_statuses = [
            Order.Status.awaiting_courier,
            Order.Status.deliver,
            Order.Status.delivered
        ]
        return Order.objects.filter(status__in=allowed_statuses)

    def get_serializer_class(self):
        if self.action in ["partial_update", "update"]:
            return OrderUpdateSerializer
        return OrderSerializer


class CourierViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourierSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != User.Role.manager:
            raise PermissionDenied("Только менеджер может просматривать курьеров.")
        return User.objects.filter(role=User.Role.courier)


class ActiveOrdersForCourierViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для курьеров: просмотр только своих заказов
    со статусом 'deliver'.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer  # или другой, если у тебя есть отдельный

    def get_queryset(self):
        user = self.request.user
        if user.role != User.Role.courier:
            raise PermissionDenied("Только курьер может просматривать свои заказы.")

        return Order.objects.filter(
            status=Order.Status.deliver,
            courier=user
        )


class HistoryOrdersForCourierViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для курьеров: просмотр только своих заказов
    со статусом 'deliver'.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer  # или другой, если у тебя есть отдельный

    def get_queryset(self):
        user = self.request.user
        if user.role != User.Role.courier:
            raise PermissionDenied("Только курьер может просматривать свои заказы.")

        return Order.objects.filter(
            status=Order.Status.delivered,
            courier=user
        )