FROM python:3.12-alpine

WORKDIR /app

# Обновляем pip и устанавливаем Poetry
RUN pip install --upgrade pip && \
    pip install poetry

# Устанавливаем плагин для Poetry (если он действительно нужен)
RUN pip install poetry-plugin-shell

# Копируем файлы Poetry (зависимости)
COPY pyproject.toml poetry.lock ./

# Устанавливаем зависимости (включая django-cors-headers, если он есть в pyproject.toml)
RUN poetry install --no-root

# Копируем остальной код приложения
COPY . .

EXPOSE 8000

# Запускаем сервер (выбери нужную команду)
CMD ["poetry", "run", "gunicorn", "--capture-output", "delivery.wsgi:application", "--bind", "0.0.0.0:8000"]

# Или для разработки:
# CMD ["poetry", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]