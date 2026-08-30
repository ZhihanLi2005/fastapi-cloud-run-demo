FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY demo.py .

EXPOSE 8080

CMD ["sh", "-c", "uvicorn demo:app --host 0.0.0.0 --port ${PORT:-8080}"]