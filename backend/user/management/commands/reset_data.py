from dish.models import Dish, Order, OrderDish, Type
from user.models import User, DeliveryAddress, UserDeliveryAddress
from django.db import connection

# Удаляем данные
Dish.objects.all().delete()
Order.objects.all().delete()
OrderDish.objects.all().delete()
User.objects.exclude(is_superuser=True).delete()  # Удаляем только обычных пользователей
DeliveryAddress.objects.all().delete()
UserDeliveryAddress.objects.all().delete()
Type.objects.all().delete()

# Сбрасываем счетчики ID (работает для PostgreSQL и MySQL)
with connection.cursor() as cursor:
    cursor.execute("ALTER SEQUENCE dish_dish_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE dish_order_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE dish_orderdish_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE dish_type_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE user_user_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE user_deliveryaddress_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE user_userdeliveryaddress_id_seq RESTART WITH 1;")

