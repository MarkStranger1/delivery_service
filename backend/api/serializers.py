"""
Содержит сериализаторы для преобразования данных:
    - Пользователя;
    - ...
"""

from dish.models import (Dish, Ingredient, IngredientAmount, Order, OrderDish, Type)
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
            "role": {"required": False},
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
    """Сериализатор для блюд в заказе (название блюда и количество)."""

    dish = serializers.CharField(source="dish.name")  # Получаем название блюда

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


class OrderDishUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления количества блюд в заказе."""

    dish = serializers.CharField(source="dish.name")

    class Meta:
        model = OrderDish
        fields = ["dish", "quantity"]

    def update(self, instance, validated_data):
        dish_name = validated_data.get("dish")
        try:
            dish = Dish.objects.get(name=dish_name)
        except Dish.DoesNotExist:
            raise serializers.ValidationError({"dish": "Такого блюда не существует"})

        instance.dish = dish
        instance.quantity = validated_data.get("quantity", instance.quantity)
        instance.save()
        return instance


class OrderCartUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления заказа со статусом 'awaiting_payment'."""

    address = serializers.CharField(required=False)
    dishes = OrderDishUpdateSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            "id", "dishes", "total_cost", "count_dishes", "status", "comment", "delivery_time", "address"
        ]
        read_only_fields = ["total_cost", "count_dishes"]

    def update(self, instance, validated_data):
        dishes_data = validated_data.pop("dishes", None)
        address_text = validated_data.pop("address", None)

        if address_text:
            address, _ = DeliveryAddress.objects.get_or_create(address=address_text)
            instance.address = address

        if dishes_data:
            instance.orderdish_set.all().delete()
            for dish_data in dishes_data:
                dish_name = dish_data["dish"]
                quantity = dish_data["quantity"]
                dish = Dish.objects.filter(name=dish_name).first()
                if not dish:
                    raise serializers.ValidationError({"dish": f"Блюдо '{dish_name}' не найдено"})
                OrderDish.objects.create(order=instance, dish=dish, quantity=quantity)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.calculate_total_cost()
        instance.calculate_count_dishes()
        instance.save()
        return instance
