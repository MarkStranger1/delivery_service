from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Настройка User для панели Admin"""

    list_display = (
        'pk',
        'email',
        'username',
        'phone',
        'scores'
    )
    list_filter = ('username', 'email')
    search_fields = ('username',)
    list_editable = ('username', 'scores')
    ordering = ('-username',)
