from django.contrib import admin
from django.contrib.auth.models import Group
from django.db.models import Sum

from .models import Dish, Ingredient, IngredientAmount, Type, Order, OrderDish

admin.site.unregister(Group)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    """Настройка Ingredient для панели Admin"""

    list_display = ('pk', 'name', 'measurement_unit')
    list_filter = ('name',)
    search_fields = ('name',)
    list_editable = ('name', 'measurement_unit',)
    ordering = ('pk',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Настройка Order для панели Admin"""

    list_display = ('pk', 'user', 'total_cost', 'payment')
    list_editable = ('user', 'total_cost', 'payment',)


@admin.register(OrderDish)
class OrderDishAdmin(admin.ModelAdmin):
    """Настройка OrderDish для панели Admin"""

    list_display = ('pk', 'order', 'dish', 'quantity')
    list_editable = ('order', 'dish', 'quantity',)



@admin.register(Type)
class TagAdmin(admin.ModelAdmin):
    """Настройка Type для панели Admin"""

    list_display = ('pk', 'name', 'slug')
    list_filter = ('name',)
    search_fields = ('name',)
    list_editable = ('name', 'slug')
    ordering = ('pk',)


@admin.register(IngredientAmount)
class IngredientAmountAdmin(admin.ModelAdmin):
    """Настройка IngredientAmount для панели Admin"""

    list_display = ('pk', 'dish', 'ingredient', 'amount')
    list_filter = ('dish',)
    search_fields = ('dish',)
    ordering = ('pk',)


class IngredientInline(admin.TabularInline):
    """Настройка IngredientAmount для панели Admin"""

    model = IngredientAmount
    extra = 1
    min_num = 1


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    """Настройка Dish для панели Admin"""

    list_display = ('pk', 'name', 'description', 'cost',
                    'ccal', 'weight', 'type', 'dish_ingredients')
    search_fields = ('name',)
    list_filter = ('name', 'type')
    inlines = [IngredientInline]
    list_editable = ('name', 'description', 'cost', 'ccal', 'weight')

    def dish_ingredients(self, obj):
        ingredients = (
            IngredientAmount.objects
            .filter(dish=obj)
            .order_by('ingredient__name').values('ingredient')
            .annotate(amount=Sum('amount'))
            .values_list(
                'ingredient__name', 'amount',
                'ingredient__measurement_unit'
            )
        )
        ingredient_list = []
        [ingredient_list.append('{} - {} {}.'.format(*ingredient))
         for ingredient in ingredients]
        return ingredient_list

    dish_ingredients.short_description = 'Ингредиенты'
