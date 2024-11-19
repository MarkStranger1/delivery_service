"""
Содержит модели, описывающие блюда:
    - Ingredient;
    - Type;
    - Dish;
    - IngredientAmount.
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from user.models import User


class Ingredient(models.Model):
    """Модель ингредиентов для блюд"""

    name = models.CharField(
        verbose_name="Название",
        max_length=settings.LIMIT_CHAR_200
    )
    measurement_unit = models.CharField(
        verbose_name="Единица измерения",
        max_length=settings.LIMIT_CHAR_200
    )

    class Meta:
        verbose_name = "Ингредиент"
        verbose_name_plural = "Ингредиенты"
        default_related_name = "Ingredients"
        constraints = [
            models.UniqueConstraint(
                fields=["name", "measurement_unit"],
                name="unique_ingredient",
            )
        ]

    def __str__(self):
        return f"{self.name} {self.measurement_unit}"


class Type(models.Model):
    """Модель типа блюда"""

    name = models.CharField(
        verbose_name="Название",
        max_length=settings.LIMIT_CHAR_100
    )
    slug = models.SlugField(
        unique=True,
        max_length=settings.LIMIT_CHAR_200
    )

    class Meta:
        verbose_name = "Тип"
        verbose_name_plural = "Типы"
        default_related_name = "Types"

    def __str__(self):
        return f"{self.name}"


class Dish(models.Model):
    """Модель блюда"""

    name = models.CharField(
        verbose_name="Название",
        max_length=settings.LIMIT_CHAR_100
    )
    description = models.CharField(
        verbose_name="Описание",
        max_length=settings.LIMIT_CHAR_500
    )
    cost = models.PositiveSmallIntegerField(
        verbose_name="Стоимость (руб)"
    )
    ccal = models.PositiveSmallIntegerField(
        verbose_name="Килокалории"
    )
    weight = models.PositiveSmallIntegerField(
        verbose_name="Вес (г)"
    )
    image = models.ImageField(
        verbose_name="Фотография",
        upload_to="dishes/"
    )
    type = models.ForeignKey(  # Связь один ко многу
        Type,
        verbose_name="Тип",
        on_delete=models.CASCADE,  # Если удалить экземлпяр Type,
                                   # то удалятся все экземпляры с
                                   # таким же значением в Dish
    )
    ingredients = models.ManyToManyField(  # Связь многим ко многим
        Ingredient,
        through='IngredientAmount',
        verbose_name="Ингредиенты"
    )

    class Meta:
        verbose_name = "Блюдо"
        verbose_name_plural = "Блюда"
        default_related_name = "Dishes"

    def __str__(self):
        return f"{self.name} - {self.cost}"


class IngredientAmount(models.Model):
    """Промежуточная модель для хранения количества ингредиентов"""

    dish = models.ForeignKey(
        Dish,
        verbose_name="Название блюда",
        on_delete=models.CASCADE
    )
    ingredient = models.ForeignKey(
        Ingredient,
        verbose_name="Ингридиент",
        on_delete=models.CASCADE
    )
    amount = models.PositiveSmallIntegerField(
        verbose_name="Количество",
        validators=[MinValueValidator(settings.MIN_VALUE_FOR_AMOUNT)],
    )

    class Meta:
        verbose_name = "Количество ингредиентов"
        verbose_name_plural = "Количество ингредиентов"

    def __str__(self):
        return f"{self.ingredient} {self.amount}"


class Order(models.Model):
    """Модель заказа"""

    user = models.ForeignKey(
        User,
        verbose_name="Пользователь",
        on_delete=models.CASCADE
    )
    dishes = models.ManyToManyField(
        Dish,
        through='OrderDish',
        verbose_name="Блюда"
    )
    total_cost = models.PositiveSmallIntegerField(
        verbose_name="Общая стоимость",
        default=0
    )
    payment = models.BooleanField(
        verbose_name="Оплачена",
        default=False
    )

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        default_related_name = "Orders"

    def __str__(self):
        return f"Заказ {self.id} от {self.user.username}"

    def calculate_total_cost(self):
        """Метод для расчета общей стоимости заказа"""
        total = 0
        for order_dish in self.orderdish_set.all():
            total += order_dish.dish.cost * order_dish.quantity
        self.total_cost = total
        self.save()


class OrderDish(models.Model):
    """Промежуточная модель для хранения количества блюд в заказе"""

    order = models.ForeignKey(
        Order,
        verbose_name="Заказ",
        on_delete=models.CASCADE
    )
    dish = models.ForeignKey(
        Dish,
        verbose_name="Блюдо",
        on_delete=models.CASCADE
    )
    quantity = models.PositiveSmallIntegerField(
        verbose_name="Количество",
        default=1
    )

    class Meta:
        verbose_name = "Блюдо в заказе"
        verbose_name_plural = "Блюда в заказе"

    def __str__(self):
        return f"{self.dish.name} - {self.quantity} шт."
