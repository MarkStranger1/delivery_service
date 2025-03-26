import csv
from django.core.management.base import BaseCommand
from user.models import DeliveryAddress

# Пути к CSV-файлам
PATH_CSV_ADDRESSES = './data/addresses.csv'


class Command(BaseCommand):
    help = 'Загрузка пользователей и адресов доставки из CSV'

    def handle(self, *args, **options):
        # Загрузка адресов доставки
        with open(PATH_CSV_ADDRESSES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for address in reader:
                DeliveryAddress.objects.get_or_create(address=address[0])

        self.stdout.write(self.style.SUCCESS('Адреса загружены успешно!'))
