# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

COPY . .

EXPOSE 5001
ENV PORT=5001

CMD ["python3", "api.py"]

