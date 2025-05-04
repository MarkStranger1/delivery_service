import csv

from dish.models import Dish, Ingredient, Type, IngredientAmount
from django.core.management.base import BaseCommand
from django.core.files import File

PATH_CSV_IMAGE_DISHES = './data/images_for_dishes.csv'


class Command(BaseCommand):
    help = 'Загрузка картинок в блюда'

    def handle(self, *args, **options):
        with open(PATH_CSV_IMAGE_DISHES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for dish_id, path_image in reader:
                with open(path_image, 'rb') as f:
                    django_file = File(f)
                    Dish.objects.get(id=dish_id).image.save('0.png', django_file, save=True)

        self.stdout.write('К блюдам успешно добавлены картинки')
