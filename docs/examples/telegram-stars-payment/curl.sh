#!/bin/bash

# Пример POST запроса для telegram-stars/payment
# Замените YOUR_API_SECRET_KEY на реальный ключ из переменной окружения API_SECRET_KEY
# Замените localhost:3000 на ваш домен, если используете другой порт

curl -X POST http://localhost:3000/bot-api/telegram-stars/payment \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1272270574,
    "username": "frntdev",
    "firstName": "S",
    "productName": "Премиум подписка на месяц",
    "description": "Доступ ко всем функциям приложения на 30 дней",
    "amount": 100,
    "currency": "XTR"
  }'
