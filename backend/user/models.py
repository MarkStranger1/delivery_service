"""Содержит модель пользователя: User"""

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField


class User(AbstractUser):
    """Модель пользователя"""

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
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = [
        "username",
        "phone",
        "scores",
    ]

    class Meta:
        ordering = ["username"]
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self):
        return str(self.username)
