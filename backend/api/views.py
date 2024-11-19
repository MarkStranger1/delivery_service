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
from djoser.permissions import CurrentUserOrAdmin
from djoser.views import UserViewSet as DjoserUserViewSet
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from user.models import User

from .filters import DishFilter, IngredientFilter
from .permissions import (CanModifyOrder, IsAdminOrOwnerAndPaymentTrue,
                          IsAdminOrReadOnly)
from .serializers import (DishReadSerializer, DishWriteSerializer,
                          IngredientSerializer, OrderSerializer,
                          TypeSerializer, UserReadSerializer)


class UserViewSet(DjoserUserViewSet):
    """View-класс реализующий операции модели User"""

    queryset = User.objects.all()
    serializer_class = UserReadSerializer


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

    queryset = Dish.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = (filters.SearchFilter, DjangoFilterBackend,)
    search_fields = ('name',)
    filterset_class = DishFilter

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DishReadSerializer
        return DishWriteSerializer


class OrderViewSet(viewsets.ModelViewSet):
    """View-класс реализующий операции модели Order"""

    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action == 'list':
            self.permission_classes = [IsAdminUser]
        elif self.action == 'retrieve':
            self.permission_classes = [CurrentUserOrAdmin]
        elif self.action in ['update', 'partial_update']:
            self.permission_classes = [CanModifyOrder]
        elif self.action == 'destroy':
            self.permission_classes = [IsAdminOrOwnerAndPaymentTrue]
        return super(OrderViewSet, self).get_permissions()

    @action(detail=False,
            methods=['post'],
            permission_classes=(CurrentUserOrAdmin,))
    def payment(self, request):
        try:
            order = Order.objects.get(user=request.user, payment=False)
        except Order.DoesNotExist:
            raise NotFound("Нету неоплаченных заказов")

        order.payment = True
        order.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False,
            methods=['get'],
            permission_classes=(CurrentUserOrAdmin,))
    def history(self, request):
        try:
            orders = Order.objects.filter(user=request.user, payment=True)
        except Order.DoesNotExist:
            raise NotFound("Нету оплаченных заказов")
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
