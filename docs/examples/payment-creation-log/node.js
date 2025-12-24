// Пример POST запроса для payment-creation-log
// Замените YOUR_API_SECRET_KEY на реальный ключ из переменной окружения API_SECRET_KEY
// Замените localhost:3000 на ваш домен, если используете другой порт

const API_SECRET_KEY = 'YOUR_API_SECRET_KEY';
const API_URL = 'http://localhost:3000/bot-api/payment-creation-log';

async function logPaymentCreation() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 1272270574,
        username: "frntdev",
        firstName: "S",
        paymentId: "payment_20240115_1272270574_001",
        amount: 1000,
        currency: "RUB",
        tariffName: "Премиум подписка"
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error:', result);
      return;
    }

    console.log('Success:', result);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Запуск функции
logPaymentCreation();
