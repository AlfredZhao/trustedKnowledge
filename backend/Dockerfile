FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY CHANGELOG.md /app/CHANGELOG.md

RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app app \
    && mkdir -p /app/backend/data/media /app/backend/data/skills /app/logs \
    && chown -R app:app /app

USER app

EXPOSE 8022

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8022"]

