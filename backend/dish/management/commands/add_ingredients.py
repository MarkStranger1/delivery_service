import csv

from dish.models import Ingredient
from django.core.management.base import BaseCommand

PATH_CSV_INGREDIENTS = './data/ingredients.csv'


class Command(BaseCommand):
    help = 'Загрузка csv в ДТ'

    def handle(self, *args, **options):
        with open(PATH_CSV_INGREDIENTS, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for name, measurement_unit in reader:
                Ingredient.objects.get_or_create(
                    name=name,
                    measurement_unit=measurement_unit
                )

        self.stdout.write('Ингридиенты добавлены')
