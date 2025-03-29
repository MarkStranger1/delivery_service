import csv
from django.core.management.base import BaseCommand
from user.models import User
from django.conf import settings
from phonenumber_field.phonenumber import PhoneNumber

# Пути к CSV-файлам
PATH_CSV_USERS = './data/users.csv'


class Command(BaseCommand):
    help = 'Загрузка пользователей и адресов доставки из CSV'

    def handle(self, *args, **options):
        # Загрузка пользователей
        with open(PATH_CSV_USERS, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Пропускаем заголовок
            for email, username, phone, scores, role in reader:
                user = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': username,
                        'phone': PhoneNumber.from_string(phone),
                        'scores': int(scores) if scores.isdigit() else settings.DEFAULT_SCORES,
                        'role': role,
                        'password': 'defaultpassword'  # Просто заглушка
                    }
                )
                user.set_password("defaultpassword")
                user.save()

        self.stdout.write(self.style.SUCCESS(
            'Пользователи загружены успешно!'))
