// Пример POST запроса для telegram-stars/payment
// Замените YOUR_API_SECRET_KEY на реальный ключ из переменной окружения API_SECRET_KEY
// Замените localhost:3000 на ваш домен, если используете другой порт

const API_SECRET_KEY = 'YOUR_API_SECRET_KEY';
const API_URL = 'http://localhost:3000/bot-api/telegram-stars/payment';

async function createTelegramStarsPayment() {
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
        productName: "Премиум подписка на месяц",
        description: "Доступ ко всем функциям приложения на 30 дней",
        amount: 100,
        currency: "XTR"
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error:', result);
      return;
    }

    console.log('Success:', result);
    console.log('Invoice Link:', result.invoiceLink);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Запуск функции
createTelegramStarsPayment();
