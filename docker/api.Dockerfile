FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY poc/requirements.txt poc/requirements.txt
RUN pip install --no-cache-dir -r poc/requirements.txt
COPY supplier_risk_dataset.csv data_explainer.html ./
COPY poc/ poc/
WORKDIR /app/poc
EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
