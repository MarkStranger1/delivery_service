from django.contrib import admin
from django.contrib.auth.models import Group
from django.db.models import Sum
from django import forms

from dish.models import Dish, Ingredient, IngredientAmount, Type, Order, OrderDish
from user.models import User

admin.site.unregister(Group)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    """Настройка Ingredient для панели Admin"""

    list_display = ('pk', 'name', 'measurement_unit')
    list_filter = ('measurement_unit',)
    search_fields = ('name',)
    list_editable = ('name', 'measurement_unit',)
    ordering = ('pk',)


class DishInline(admin.TabularInline):
    """Настройка OrderDish для панели Admin"""

    model = OrderDish
    extra = 1
    min_num = 1


class OrderAdminForm(forms.ModelForm):
    """Кастомная форма для Order в админке"""
    user = forms.ModelChoiceField(
        queryset=User.objects.filter(role=User.Role.client),
        label="Клиент",
        required=True,
    )
    courier = forms.ModelChoiceField(
        queryset=User.objects.filter(role=User.Role.courier),
        label="Курьер",
        required=False,
    )

    class Meta:
        model = Order
        fields = '__all__'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Настройка Order для панели Admin"""

    list_display = (
        'pk',
        'user',
        'courier',
        'total_cost',
        'count_dishes',
        'status',
        'address'
    )
    inlines = [DishInline]
    form = OrderAdminForm
    list_filter = ('status', )
    list_editable = ('user', 'courier', 'status', 'address')
    ordering = ('pk',)

    def order_dish(self, obj):
        dishes = (
            OrderDish.objects
            .filter(order=obj)
            .order_by('dish__name').values('dish')
            .values_list('dish__name', 'quantity')
        )
        dish_list = []
        [dish_list.append('{} - {}.'.format(*dish))
         for dish in dishes]
        return dish_list

    order_dish.short_description = 'Блюда'


# если хочется скрыть, то можно полностью удалить
@admin.register(OrderDish)
class OrderDishAdmin(admin.ModelAdmin):
    """Настройка OrderDish для панели Admin"""

    list_display = ('pk', 'order', 'dish', 'quantity')
    search_fields = ('order__id', 'dish__name')
    ordering = ('pk',)


@admin.register(Type)
class TagAdmin(admin.ModelAdmin):
    """Настройка Type для панели Admin"""

    list_display = ('pk', 'name', 'slug')
    search_fields = ('name', 'slug')
    list_editable = ('name', 'slug')
    ordering = ('pk',)


@admin.register(IngredientAmount)
class IngredientAmountAdmin(admin.ModelAdmin):
    """Настройка IngredientAmount для панели Admin"""

    list_display = ('pk', 'dish', 'ingredient', 'amount')
    search_fields = ('dish__name', 'ingredient__name')
    ordering = ('pk',)


class IngredientInline(admin.TabularInline):
    """Настройка IngredientAmount для панели Admin"""

    model = IngredientAmount
    extra = 1
    min_num = 1


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    """Настройка Dish для панели Admin"""

    list_display = (
        'pk',
        'name',
        'cost',
        'cuisine',
        'type',
        'dish_ingredients'
    )
    search_fields = ('name', )
    list_filter = ('type', 'cuisine')
    inlines = [IngredientInline]
    list_editable = ('name', 'cost', 'cuisine')
    ordering = ('pk',)

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
