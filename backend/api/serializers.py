"""
Содержит сериализаторы для преобразования данных:
    - Пользователя;
    - ...
"""

from dish.models import (
    Dish, Ingredient, IngredientAmount, Order, OrderDish, Type)
from django.conf import settings
from djoser.serializers import UserSerializer
from drf_extra_fields.fields import Base64ImageField
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers
from user.models import User, DeliveryAddress


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


class DishWriteSerializer(serializers.ModelSerializer):
    """Преобразование данных класса Dish на запись"""

    ingredients = IngredientAmountSerializer(
        many=True,
        source='ingredientamount_set'
    )
    type = serializers.SlugRelatedField(
        queryset=Type.objects.all(),
        slug_field='slug',
    )
    image = Base64ImageField()
    is_in_order = serializers.SerializerMethodField()
    cost = serializers.IntegerField()
    ccal = serializers.IntegerField()
    weight = serializers.IntegerField()

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
            'type',
            'ingredients',
            'is_in_order',
        )

    def validate(self, attrs):
        if Dish.objects.filter(name=attrs['name']).exists():
            raise serializers.ValidationError(
                {'name': 'Блюдо с таким названием уже существует'}
            )
        ingredients = []
        for ingredient in attrs['ingredientamount_set']:
            if ingredient['ingredient'] not in ingredients:
                ingredients.append(ingredient['ingredient'])
            else:
                raise serializers.ValidationError(
                    {'ingredients': 'Ингредиент должен быть уникальным'}
                )
            if int(ingredient['amount']) < settings.MIN_VALUE_FOR_AMOUNT:
                raise serializers.ValidationError(
                    {'amount': 'Минимальный объем|вес 1'}
                )
        if not ingredients:
            raise serializers.ValidationError(
                {'ingredients': 'Должен быть выбран хотя бы один ингредиент'}
            )
        if int(attrs['cost']) < settings.MIN_VALUE_FOR_COST:
            raise serializers.ValidationError(
                {'cost': 'Минимальная стоимость 1'}
            )
        if int(attrs['ccal']) < settings.MIN_VALUE_FOR_CCAL:
            raise serializers.ValidationError(
                {'ccal': 'Минимальные калории 1'}
            )
        if int(attrs['weight']) < settings.MIN_VALUE_FOR_WEIGHT:
            raise serializers.ValidationError(
                {'weight': 'Минимальный вес 1'}
            )
        return attrs

    @staticmethod
    def dishes_ingredients_add(ingredients, dish):
        ingredients_amount = [
            IngredientAmount(
                ingredient=Ingredient.objects.get(
                    id=ingredient['ingredient']['id']
                ),
                dish=dish,
                amount=ingredient['amount']
            ) for ingredient in ingredients
        ]
        IngredientAmount.objects.bulk_create(ingredients_amount)

    def create(self, validated_data):
        ingredients = validated_data.pop('ingredientamount_set')
        dish = Dish.objects.create(**validated_data)
        self.dishes_ingredients_add(ingredients, dish)
        return dish

    def update(self, instance, validated_data):
        IngredientAmount.objects.filter(dish=instance).delete()
        ingredients = validated_data.pop('ingredientamount_set')
        self.dishes_ingredients_add(ingredients, instance)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        return DishReadSerializer(
            instance,
            context={'request': self.context.get('request')}
        ).data


class DishReadSerializer(serializers.ModelSerializer):
    """Преобразование данных класса Dish на чтение"""

    type = TypeSerializer(read_only=True)
    ingredients = IngredientAmountSerializer(
        many=True,
        source='ingredientamount_set'
    )
    is_in_order = serializers.SerializerMethodField()
    # image = serializers.SerializerMethodField()

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

    # def get_image(self, obj):
    #     if obj.image:
    #         with obj.image.open('rb') as image_file:
    #             return image_file.read()
    #     return None


class OrderDishSerializer(serializers.ModelSerializer):
    """Сериализатор для блюд в заказе (название блюда и количество)."""

    dish = serializers.CharField(source="dish.name")  # Получаем название блюда

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


class OrderDishUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления списка блюд в заказе."""

    dish = serializers.CharField()  # Ожидаем название блюда, а не ID

    class Meta:
        model = OrderDish
        fields = ["dish", "quantity"]


class OrderCartUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления заказа со статусом 'awaiting_payment'."""

    address = serializers.CharField()
    dishes = OrderDishUpdateSerializer(many=True)

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

    def update(self, instance, validated_data):
        """Метод обновления заказа"""
        dishes_data = validated_data.pop("dishes", None)
        address_text = validated_data.pop("address", None)

        if address_text:
            address, _ = DeliveryAddress.objects.get_or_create(
                address=address_text)
            instance.address = address

        if dishes_data:
            instance.orderdish_set.all().delete()  # Удаляем старые блюда
            total_cost = 0
            total_count = 0

            for dish_data in dishes_data:
                dish_name = dish_data["dish"]
                quantity = dish_data["quantity"]

                dish = Dish.objects.filter(name=dish_name).first()
                if not dish:
                    raise serializers.ValidationError(
                        {"dish": f"Блюдо '{dish_name}' не найдено"})

                OrderDish.objects.create(
                    order=instance, dish=dish, quantity=quantity)
                total_cost += dish.cost * quantity
                total_count += quantity

            instance.total_cost = total_cost
            instance.count_dishes = total_count

        instance.save()
        return instance


class OrderSerializer(serializers.ModelSerializer):
    dishes = OrderDishSerializer(source='orderdish_set', many=True)
    user = UserReadSerializer(read_only=True)
    total_cost = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'dishes', 'total_cost', 'status']

    def validate(self, attrs):
        for attr in attrs['orderdish_set']:
            if not Dish.objects.filter(
                    id=attr['dish']['id']
            ).exists():
                raise serializers.ValidationError(
                    {'dish': 'Такого блюда не существует'}
                )
        return attrs

    def create(self, validated_data):
        if Order.objects.filter(
                user=self.context['request'].user,
                payment=False
        ).exists():
            raise serializers.ValidationError(
                {'payment': 'У вас уже есть не оплаченный заказ'}
            )
        order_dishes_data = validated_data.pop('orderdish_set')
        order = Order.objects.create(**validated_data,
                                     user=self.context['request'].user)
        for order_dish_data in order_dishes_data:
            OrderDish.objects.create(order=order,
                                     dish=Dish.objects.get(
                                         id=order_dish_data['dish']['id']
                                     ))
        order.calculate_total_cost()
        order.save()
        return order

    def update(self, instance, validated_data):
        order_dishes_data = validated_data.pop('orderdish_set')
        instance.user = validated_data.get('user', instance.user)
        instance.payment = validated_data.get('payment', instance.payment)
        instance.save()

        for order_dish_data in order_dishes_data:
            dish_id = order_dish_data['dish']['id']
            dish_instance = Dish.objects.get(id=dish_id)
            quantity = order_dish_data.get('quantity', 1)

            order_dish, created = OrderDish.objects.get_or_create(
                order=instance,
                dish=dish_instance,
                defaults={'quantity': quantity}
            )

            if not created:
                order_dish.quantity += quantity
                order_dish.save()

        instance.calculate_total_cost()
        instance.save()
        return instance
