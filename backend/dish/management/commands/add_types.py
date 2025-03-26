import csv

from dish.models import Type
from django.core.management.base import BaseCommand

PATH_CSV_TYPES = './data/types.csv'


class Command(BaseCommand):
    help = 'Загрузка csv в ДТ'

    def handle(self, *args, **options):
        with open(PATH_CSV_TYPES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for name, slug in reader:
                Type.objects.get_or_create(
                    name=name,
                    slug=slug
                )

        self.stdout.write('Теги добавлены')
