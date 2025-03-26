import csv
from django.core.management.base import BaseCommand
from user.models import User, DeliveryAddress, UserDeliveryAddress

# Пути к CSV-файлам
PATH_CSV_USER_ADDRESSES = './data/user_addresses.csv'


class Command(BaseCommand):
    help = 'Загрузка пользователей и адресов доставки из CSV'

    def handle(self, *args, **options):
        # Загрузка связей пользователей и адресов
        with open(PATH_CSV_USER_ADDRESSES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for username, address, is_default in reader:
                user = User.objects.filter(username=username).first()
                delivery_address = DeliveryAddress.objects.filter(address=address).first()
                if user and delivery_address:
                    UserDeliveryAddress.objects.get_or_create(
                        user=user,
                        delivery_address=delivery_address,
                        defaults={'is_default': is_default.lower() == 'true'}
                    )

        self.stdout.write(self.style.SUCCESS('Пользователи успешно связаны с их адресами!'))
