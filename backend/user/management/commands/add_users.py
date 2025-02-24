import csv
from django.core.management.base import BaseCommand
from user.models import User, DeliveryAddress, UserDeliveryAddress
from django.conf import settings
from phonenumber_field.phonenumber import PhoneNumber

# Пути к CSV-файлам
PATH_CSV_USERS = './data/users.csv'
PATH_CSV_ADDRESSES = './data/addresses.csv'
PATH_CSV_USER_ADDRESSES = './data/user_addresses.csv'


class Command(BaseCommand):
    help = 'Загрузка пользователей и адресов доставки из CSV'

    def handle(self, *args, **options):
        # Загрузка пользователей
        with open(PATH_CSV_USERS, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Пропускаем заголовок
            for email, username, phone, scores, role in reader:
                User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': username,
                        'phone': PhoneNumber.from_string(phone),
                        'scores': int(scores) if scores.isdigit() else settings.DEFAULT_SCORES,
                        'role': role,
                        'password': 'defaultpassword'  # Лучше потом поменять
                    }
                )

        # Загрузка адресов доставки
        with open(PATH_CSV_ADDRESSES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for address in reader:
                DeliveryAddress.objects.get_or_create(address=address[0])

        # Загрузка связей пользователей и адресов
        with open(PATH_CSV_USER_ADDRESSES, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for user_id, address_id, is_default in reader:
                user = User.objects.filter(id=user_id).first()
                delivery_address = DeliveryAddress.objects.filter(id=address_id).first()
                if user and delivery_address:
                    UserDeliveryAddress.objects.get_or_create(
                        user=user,
                        delivery_address=delivery_address,
                        defaults={'is_default': is_default.lower() == 'true'}
                    )

        self.stdout.write(self.style.SUCCESS('Пользователи и адреса загружены успешно!'))
