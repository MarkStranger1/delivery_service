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
    old_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["email", "username", "phone", "scores",
                  "role", "old_password", "new_password"]
        extra_kwargs = {
            "email": {"required": False},
            "username": {"required": False},
            "phone": {"required": False},
            "scores": {"required": False},
            "role": {"read_only": True},
        }

    def update(self, instance, validated_data):
        old_password = validated_data.pop("old_password", None)
        new_password = validated_data.pop("new_password", None)

        # Обновление остальных полей
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Проверка и установка нового пароля
        if old_password and new_password:
            if not instance.check_password(old_password):
                raise serializers.ValidationError(
                    {"old_password": "Старый пароль указан неверно."})
            instance.set_password(new_password)

        instance.save()
        return instance


class UserDeliveryAddressSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="delivery_address.id")
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
    # Используем вложенный сериализатор
    dishes = OrderDishSerializer(source="orderdish_set", many=True)

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

    dishes_ordered = OrderDishUpdateSerializer(
        many=True, write_only=True)  # Позволяет обновлять блюда в заказе

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "comment",
            "delivery_time",
            "address",
            "dishes_ordered",
        ]

    def create(self, validated_data):
        dishes_data = validated_data.pop("dishes_ordered", [])
        # Удаляем user, если он есть в validated_data
        validated_data.pop("user", None)
        validated_data.pop("status", None)

        order = Order.objects.create(
            user=self.context['request'].user,
            status=Order.Status.awaiting_payment,
            **validated_data
        )

        order_dishes = [
            OrderDish(
                order=order, dish=dish_data["dish"], quantity=dish_data["quantity"])
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
            OrderDish(order=instance,
                      dish=dish["dish"], quantity=dish["quantity"])
            for dish in dishes_data
        ]
        OrderDish.objects.bulk_create(order_dishes)  # Добавляем новые записи
        instance.calculate_total_cost()
        instance.calculate_count_dishes()
        return instance


class OrderActiveUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления заказов."""

    dishes_ordered = OrderDishUpdateSerializer(
        many=True, write_only=True)  # Позволяет обновлять блюда в заказе

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "comment",
            "delivery_time",
            "address",
            "dishes_ordered",
        ]


class UserOrderSerializer(serializers.ModelSerializer):
    """Сериализатор для пользователя: имя, телефон и почта."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "phone"]


class CourierSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["id", "username", "email", "phone"]


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        fields = ["id", "address"]


class OrderSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Order со всеми полями и блюдами в заказе."""

    user = UserOrderSerializer(read_only=True)
    courier = CourierSerializer(read_only=True)
    address = AddressSerializer(read_only=True)
    orderdish_set = OrderDishSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "courier",
            "orderdish_set",  # используется OrderDishSerializer
            "total_cost",
            "count_dishes",
            "status",
            "comment",
            "delivery_time",
            "address"
        ]


class OrderUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления заказа."""

    orderdish_set = OrderDishUpdateSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            "courier",
            "status",
            "comment",
            "delivery_time",
            "address",
            "orderdish_set"
        ]

    def update(self, instance, validated_data):
        orderdishes_data = validated_data.pop("orderdish_set", [])

        # Проверка, был ли назначен курьер
        new_courier = validated_data.get("courier", instance.courier)
        if instance.courier is None and new_courier is not None:
            # Автоматически устанавливаем статус 'deliver', если курьер был назначен впервые
            validated_data["status"] = Order.Status.deliver

        # Обновление полей заказа
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Перепривязываем блюда в заказе: удалим старые и создадим новые
        instance.orderdish_set.all().delete()
        for od_data in orderdishes_data:
            OrderDish.objects.create(order=instance, **od_data)

        instance.calculate_total_cost()
        instance.calculate_count_dishes()

        return instance
