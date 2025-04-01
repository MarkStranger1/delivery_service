"""Содержит модель пользователя: User"""

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField


class User(AbstractUser):
    """Модель пользователя"""

    class Role(models.TextChoices):
        client = "client", "Клиент"
        administrator = "administrator", "Администратор"
        courier = "courier", "Курьер"
        manager = "manager", "Менеджер"

    email = models.EmailField(
        verbose_name="E-mail",
        max_length=settings.LIMIT_CHAR_254,
        unique=True
    )
    password = models.CharField(
        verbose_name="Пароль",
        max_length=settings.LIMIT_CHAR_150
    )
    username = models.CharField(
        verbose_name="Логин",
        max_length=settings.LIMIT_CHAR_150,
        unique=True
    )
    phone = PhoneNumberField(
        verbose_name="Телефон",
        blank=True
    )
    scores = models.PositiveSmallIntegerField(
        verbose_name="Баллы",
        blank=True,
        default=settings.DEFAULT_SCORES
    )
    role = models.CharField(
        verbose_name="Роль",
        max_length=settings.LIMIT_CHAR_150,
        choices=Role.choices,
        default=Role.client
    )
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = [
        "username",
        "phone",
        # "scores",
    ]

    def save(self, *args, **kwargs):
        # Устанавливаем роль администратора при создании суперпользователя
        if self.is_superuser:
            self.role = self.Role.administrator
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["username"]
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return str(self.username)


class DeliveryAddress(models.Model):

    address = models.CharField(
        verbose_name="Адрес доставки",
        max_length=settings.LIMIT_CHAR_254
    )

    class Meta:
        ordering = ["address"]
        verbose_name = "Адрес доставки"
        verbose_name_plural = "Адреса доставки"

    def __str__(self):
        return str(self.address)


class UserDeliveryAddress(models.Model):

    user = models.ForeignKey(
        User,
        verbose_name="Клиент",
        on_delete=models.CASCADE
    )
    delivery_address = models.ForeignKey(
        DeliveryAddress,
        verbose_name="Адрес доставки",
        on_delete=models.CASCADE
    )
    is_default = models.BooleanField(
        verbose_name="Основной адрес"
    )

    def save(self, *args, **kwargs):

        if self.is_default:
            # Сбрасываем is_default у всех других адресов этого пользователя
            UserDeliveryAddress.objects.filter(user=self.user).exclude(
                id=self.id).update(is_default=False)

        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Адрес пользователя"
        verbose_name_plural = "Адреса пользователя"

    def __str__(self):
        return f"{self.user.username} - {self.delivery_address.address}"
