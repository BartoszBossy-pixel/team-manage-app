# 🔄 Restart Serwera - Napraw DynamoDB

## ❌ Problem:
Serwer pokazuje błąd: `"Missing credentials in config"`

## ✅ Rozwiązanie:

### 1. Zatrzymaj obecny serwer:
W terminalu gdzie działa `node server.js` naciśnij **Ctrl+C**

### 2. Uruchom ponownie:
```bash
node server.js
```

### 3. Sprawdź czy działa:
```bash
curl http://localhost:3001/api/debug/database
```

Powinieneś zobaczyć:
```json
{
  "success": true,
  "database": {
    "Users": {
      "count": 0,
      "items": []
    },
    "TableSettings": {
      "count": 0,
      "items": []
    }
  }
}
```

## 🎯 Dlaczego to się stało:

Serwer został uruchomiony **przed** dodaniem zmiennych AWS do `.env`:
```bash
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:8000
```

Node.js ładuje zmienne środowiskowe tylko przy starcie, więc restart jest konieczny.

## ✅ Po restarcie:

- DynamoDB Local będzie działać poprawnie
- Ustawienia InProgressTable będą zapisywane w DynamoDB
- Endpoint `/api/debug/database` pokaże prawdziwe dane
- DynamoDB Admin UI (http://localhost:8001) będzie pokazywać tabele

## 🚀 Następny krok:

Po restarcie serwera uruchom frontend:
```bash
npm run dev