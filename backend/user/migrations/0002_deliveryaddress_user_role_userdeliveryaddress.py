# Generated by Django 5.0.3 on 2025-01-11 15:32

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryAddress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('address', models.CharField(max_length=254, verbose_name='Адрес доставки')),
            ],
            options={
                'verbose_name': 'Адрес доставки',
                'verbose_name_plural': 'Адреса доставки',
                'ordering': ['address'],
            },
        ),
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(choices=[('client', 'Клиент'), ('administrator', 'Администратор'), ('courier', 'Курьер'), ('manager', 'Менеджер')], default='client', max_length=150, verbose_name='Роль'),
        ),
        migrations.CreateModel(
            name='UserDeliveryAddress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_default', models.BooleanField(verbose_name='Основной адрес')),
                ('delivery_address', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='user.deliveryaddress', verbose_name='Адрес доставки')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Клиент')),
            ],
            options={
                'verbose_name': 'Адрес пользователя',
                'verbose_name_plural': 'Адреса пользователя',
            },
        ),
    ]
