from django.contrib import admin

from .models import User, DeliveryAddress, UserDeliveryAddress


class DeliveryAddressInline(admin.TabularInline):
    """Настройка UserDeliveryAddress для панели Admin"""

    model = UserDeliveryAddress
    extra = 1


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Настройка User для панели Admin"""

    list_display = (
        'pk',
        'email',
        'username',
        'phone',
        'scores',
        'role'
    )
    exclude = (
        'password',
        'last_login',
        'last_name',
        'first_name',
        'is_superuser',
        'is_staff',
        'is_active',
        'groups',
        'user_permissions',
    )
    readonly_fields = ('date_joined',)
    list_filter = ('username', 'email', 'role')
    search_fields = ('username',)
    inlines = [DeliveryAddressInline]
    list_editable = (
        'email',
        'username',
        'phone',
        'scores',
    )
    ordering = ('pk',)


@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(admin.ModelAdmin):
    """Настройка DeliveryAddress для панели Admin"""

    list_display = (
        'pk',
        'address'
    )
    list_filter = ('address',)
    search_fields = ('address',)
    list_editable = ('address',)
    ordering = ('pk',)


@admin.register(UserDeliveryAddress)
class UserDeliveryAddressAdmin(admin.ModelAdmin):
    """Настройка UserDeliveryAddress для панели Admin"""

    list_display = (
        'pk',
        'user',
        'delivery_address',
        'is_default'
    )
    list_filter = ('user',)
    search_fields = ('user', 'delivery_address', 'is_default')
    list_editable = ('user', 'delivery_address', 'is_default')
    ordering = ('pk',)
