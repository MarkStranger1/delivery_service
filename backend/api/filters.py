from dish.models import Dish, Ingredient, Type
from django_filters.rest_framework import FilterSet, filters


class IngredientFilter(FilterSet):
    """Поиск ингредиента по полю name регистронезависимо
        начиная с указанного значения"""

    name = filters.CharFilter(
        field_name='name',
        lookup_expr='istartswith',
    )

    class Meta:
        model = Ingredient
        fields = ('name',)


class DishFilter(FilterSet):
    """Фильтрация по тегам"""

    type = filters.ModelChoiceFilter(
        field_name='type__slug',
        to_field_name='slug',
        queryset=Type.objects.all()
    )

    class Meta:
        model = Dish
        fields = (
            'type',
        )
