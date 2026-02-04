# Instrukcje Restartu Serwera

## Problem
Serwer nie może połączyć się z lokalną bazą DynamoDB z powodu braku konfiguracji dotenv.

## Rozwiązanie
Dodałem `import 'dotenv/config';` na początku server.js aby załadować zmienne środowiskowe z pliku .env.

## Kroki Restartu

### 1. Zatrzymaj obecny serwer
W terminalu gdzie działa serwer naciśnij `Ctrl+C`

### 2. Uruchom serwer ponownie
```bash
npm run server
```

### 3. Sprawdź czy serwer działa
```bash
curl -X GET http://localhost:3001/health
```

### 4. Przetestuj endpoint API
```bash
curl -X POST http://localhost:3001/api/table-settings \
  -H "Content-Type: application/json" \
  -d '{"id":"test","userId":null,"columns":[],"filters":{},"sort":{},"pageSize":10,"lastUpdated":123456}'
```

**Oczekiwany wynik:**
```json
{"success":true,"message":"Settings saved to DynamoDB"}
```

## Zmienne Środowiskowe
Serwer teraz będzie używał następujących zmiennych z .env:
- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=dummy`
- `AWS_SECRET_ACCESS_KEY=dummy`
- `AWS_ENDPOINT_URL=http://localhost:8000`

## Weryfikacja
Po restarcie serwera:
1. API endpoints powinny działać
2. InProgressTable będzie zapisywać do DynamoDB przez API
3. Inne tabele nadal będą używać localStorage

## Następne Kroki
Po pomyślnym restarcie serwera można przetestować system zgodnie z instrukcjami w `TESTOWANIE-API-TABELI.md`.