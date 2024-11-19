FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip && \
    pip install poetry

COPY poetry.lock pyproject.toml ./

RUN poetry install

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "gunicorn", "--capture-output", "delivery.wsgi:application", "--bind", "0.0.0.0:8000"]
