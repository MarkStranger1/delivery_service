"""
Содержит сериализаторы для преобразования данных:
    - Пользователя;
    - ...
"""

from dish.models import Dish, Ingredient, IngredientAmount, Order, OrderDish, Type
from djoser.serializers import UserSerializer
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers
from user.models import User, DeliveryAddress, UserDeliveryAddress


class UserReadSerializer(UserSerializer):
    """Преобразование данных класса User на чтение"""

    email = serializers.ReadOnlyField()
    username = serializers.ReadOnlyField()
    phone = PhoneNumberField()
    scores = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "phone",
            "scores",
            "role"
        )


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "username", "phone", "scores", "role"]
        extra_kwargs = {
            "email": {"required": False},
            "username": {"required": False},
            "phone": {"required": False},
            "scores": {"required": False},
            "role": {"read_only": True},  # Делаем role только для чтения
        }


class UserDeliveryAddressSerializer(serializers.ModelSerializer):
    delivery_address = serializers.CharField(source="delivery_address.address")

    class Meta:
        model = UserDeliveryAddress
        fields = ['id', 'delivery_address', 'is_default']


class IngredientSerializer(serializers.ModelSerializer):
    """Преобразование данных класса Ingredient"""

    class Meta:
        model = Ingredient
        fields = (
            "id",
            "name",
            "measurement_unit",
        )


class TypeSerializer(serializers.ModelSerializer):
    """Преобразование данных класса Type"""

    class Meta:
        model = Type
        fields = (
            "id",
            "name",
            "slug",
        )


class IngredientAmountSerializer(serializers.ModelSerializer):
    """Преобразование данных класса IngredientAmount"""

    id = serializers.IntegerField(source='ingredient.id')
    name = serializers.ReadOnlyField(source='ingredient.name')
    measurement_unit = serializers.ReadOnlyField(
        source='ingredient.measurement_unit'
    )
    amount = serializers.IntegerField()

    class Meta:
        model = IngredientAmount
        fields = (
            'id',
            'name',
            'measurement_unit',
            'amount',
        )


class DishReadSerializer(serializers.ModelSerializer):
    """Преобразование данных класса Dish на чтение"""

    type = TypeSerializer(read_only=True)
    ingredients = IngredientAmountSerializer(
        many=True,
        source='ingredientamount_set'
    )
    is_in_order = serializers.SerializerMethodField()

    class Meta:
        model = Dish
        fields = (
            'id',
            'name',
            'description',
            'cost',
            'ccal',
            'weight',
            'image',
            'cuisine',
            'type',
            'ingredients',
            'is_in_order',
        )

    def get_is_in_order(self, obj):
        request = self.context.get('request')
        return (request and request.user.is_authenticated
                and Order.objects.filter(
                    user=request.user, dishes=obj
                ).exists())


class OrderDishSerializer(serializers.ModelSerializer):
    """Сериализатор для блюд в заказе (id блюда, название и количество)."""

    id = serializers.IntegerField(source="dish.id")  # Добавляем ID блюда
    dish = serializers.CharField(source="dish.name")  # Получаем название блюда
    quantity = serializers.IntegerField()  # Количество блюда

    class Meta:
        model = OrderDish
        fields = ["id", "dish", "quantity"]  # Включаем ID в список полей


class OrderDishUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления блюд в заказе."""

    class Meta:
        model = OrderDish
        fields = ["dish", "quantity"]


class OrderCartSerializer(serializers.ModelSerializer):
    """Сериализатор заказов со статусом 'awaiting_payment'."""

    address = serializers.StringRelatedField()  # Отображает текстовый адрес
    dishes = OrderDishSerializer(source="orderdish_set", many=True)  # Используем вложенный сериализатор

    class Meta:
        model = Order
        fields = [
            "id",
            "dishes",
            "total_cost",
            "count_dishes",
            "status",
            "comment",
            "delivery_time",
            "address",
        ]


class OrderCartUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления заказов."""

    dishes_ordered = OrderDishUpdateSerializer(many=True, write_only=True)  # Позволяет обновлять блюда в заказе

    class Meta:
        model = Order
        fields = [
            "status",
            "comment",
            "delivery_time",
            "address",
            "dishes_ordered",
        ]

    def create(self, validated_data):
        dishes_data = validated_data.pop("dishes_ordered", [])
        validated_data.pop("user", None)  # Удаляем user, если он есть в validated_data
        validated_data.pop("status", None)

        order = Order.objects.create(
            user=self.context['request'].user,
            status=Order.Status.awaiting_payment,
            **validated_data
        )

        order_dishes = [
            OrderDish(order=order, dish=dish_data["dish"], quantity=dish_data["quantity"])
            for dish_data in dishes_data
        ]
        OrderDish.objects.bulk_create(order_dishes)

        order.calculate_total_cost()
        order.calculate_count_dishes()

        return order

    def update(self, instance, validated_data):
        dishes_data = validated_data.pop("dishes_ordered", [])
        instance = super().update(instance, validated_data)
        instance.orderdish_set.all().delete()  # Удаляем старые записи

        order_dishes = [
            OrderDish(order=instance, dish=dish["dish"], quantity=dish["quantity"])
            for dish in dishes_data
        ]
        OrderDish.objects.bulk_create(order_dishes)  # Добавляем новые записи
        instance.calculate_total_cost()
        instance.calculate_count_dishes()
        return instance
