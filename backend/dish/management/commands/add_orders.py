import csv

from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from datetime import datetime

from dish.models import Order, OrderDish, Dish
from user.models import User, DeliveryAddress

PATH_CSV_ORDERS = './data/orders.csv'


class Command(BaseCommand):
    help = 'Загрузка заказов из CSV'

    def handle(self, *args, **options):
        with open(PATH_CSV_ORDERS, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Пропускаем заголовок

            for row in reader:
                (user_id, courier_id, status, comment, delivery_time, address_id, dish_data) = row

                # Получаем связанные объекты
                user = User.objects.get(id=user_id)
                courier = User.objects.get(id=courier_id) if courier_id else None
                address = DeliveryAddress.objects.get(id=address_id) if address_id else None

                # Создаем заказ
                order, created = Order.objects.get_or_create(
                    user=user,
                    courier=courier,
                    status=status,
                    comment=comment if comment else None,
                    delivery_time=make_aware(datetime.strptime(delivery_time, '%Y-%m-%d %H:%M:%S')),
                    address=address
                )

                if created:
                    # Обрабатываем блюда в заказе
                    for dish_info in dish_data.split(';'):
                        dish_id, quantity = dish_info.split(':')
                        dish = Dish.objects.get(id=dish_id)

                        OrderDish.objects.create(
                            order=order,
                            dish=dish,
                            quantity=int(quantity)
                        )

                # Пересчитываем общую стоимость и количество блюд
                order.calculate_total_cost()
                order.calculate_count_dishes()

        self.stdout.write('Заказы успешно добавлены')
