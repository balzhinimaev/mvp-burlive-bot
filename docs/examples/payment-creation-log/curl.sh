#!/bin/bash

# Пример POST запроса для payment-creation-log
# Замените YOUR_API_SECRET_KEY на реальный ключ из переменной окружения API_SECRET_KEY
# Замените localhost:3000 на ваш домен, если используете другой порт

curl -X POST http://localhost:3000/bot-api/payment-creation-log \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1272270574,
    "username": "frntdev",
    "firstName": "S",
    "paymentId": "payment_20240115_1272270574_001",
    "amount": 1000,
    "currency": "RUB",
    "tariffName": "Премиум подписка"
  }'
