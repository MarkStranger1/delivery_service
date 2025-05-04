import csv

from dish.models import Dish, Ingredient, Type, IngredientAmount
from django.core.management.base import BaseCommand

PATH_CSV_DISHES = './data/dishes.csv'


class Command(BaseCommand):
    help = 'Загрузка csv в блюда'

    def handle(self, *args, **options):
        with open(PATH_CSV_DISHES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for name, description, cost, ccal, weight, image, cuisine, type_slug, *ingredient_data in reader:
                # Получаем тип блюда по slug
                type_instance = Type.objects.get(slug=type_slug)

                # Создаем или получаем блюдо
                dish, created = Dish.objects.get_or_create(
                    name=name,
                    description=description,
                    cost=cost,
                    ccal=ccal,
                    weight=weight,
                    cuisine=cuisine,
                    type=type_instance
                )

                # Если блюдо было создано, добавляем ингредиенты и их количество
                if created:
                    for ingredient_info in ingredient_data:
                        if ingredient_info:  # Проверяем, что ингредиент не пустой
                            ingredient_name, amount = ingredient_info.split(":")
                            ingredient_instance = Ingredient.objects.get(name=ingredient_name)
                            # Добавляем запись в IngredientAmount
                            IngredientAmount.objects.create(
                                dish=dish,
                                ingredient=ingredient_instance,
                                amount=int(amount)  # Преобразуем в целое число
                            )

        self.stdout.write('Блюда и их количества ингредиентов успешно добавлены')
