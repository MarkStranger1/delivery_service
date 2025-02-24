FROM python:3.12-alpine

WORKDIR /app

# ENV POETRY_VIRTUALENVS_CREATE=false

RUN pip install --upgrade pip && \
    pip install poetry

RUN pip install poetry-plugin-shell

COPY poetry.lock pyproject.toml ./

RUN poetry install

COPY . .

EXPOSE 8000

# CMD ["poetry", "run", "gunicorn", "--capture-output", "delivery.wsgi:application", "--bind", "0.0.0.0:8000"]

# CMD ["python3", "manage.py", "runserver", "0:8000"]