# DynamoDB Setup Guide

Ten przewodnik opisuje jak skonfigurować DynamoDB dla KPI Dashboard.

## Opcje Deploymentu

### 1. DynamoDB Local (Development)

Dla lokalnego developmentu możesz użyć DynamoDB Local:

```bash
# Zainstaluj DynamoDB Local
npm install -g dynamodb-local

# Uruchom DynamoDB Local
dynamodb-local

# Lub użyj Docker
docker run -p 8000:8000 amazon/dynamodb-local
```

Następnie w pliku `.env` ustaw:
```
VITE_DYNAMODB_ENDPOINT=http://localhost:8000
```

### 2. AWS DynamoDB (Production)

Dla produkcji skonfiguruj prawdziwy DynamoDB w AWS:

1. **Utwórz tabele w AWS Console lub użyj AWS CLI:**

```bash
# Tabela użytkowników
aws dynamodb create-table \
    --table-name kpi-dashboard-users \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

# Tabela ustawień użytkowników
aws dynamodb create-table \
    --table-name kpi-dashboard-user-settings \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=settingKey,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=settingKey,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
```

2. **Skonfiguruj zmienne środowiskowe:**

```env
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your-access-key
VITE_AWS_SECRET_ACCESS_KEY=your-secret-key
VITE_DYNAMODB_USERS_TABLE=kpi-dashboard-users
VITE_DYNAMODB_USER_SETTINGS_TABLE=kpi-dashboard-user-settings
```

## Automatyczna Inicjalizacja

Aplikacja automatycznie sprawdzi dostępność DynamoDB i:
- Jeśli DynamoDB jest dostępne, użyje go jako głównej bazy danych
- Jeśli DynamoDB nie jest dostępne, użyje localStorage jako fallback

## Struktura Tabel

### Tabela `kpi-dashboard-users`
- **Partition Key**: `id` (String) - accountId użytkownika z Jira
- **Atrybuty**:
  - `displayName` - Imię i nazwisko
  - `email` - Adres email
  - `role` - Rola w zespole
  - `customColor` - Niestandardowy kolor avatara (opcjonalny)
  - `lastUpdated` - Timestamp ostatniej aktualizacji

### Tabela `kpi-dashboard-user-settings`
- **Partition Key**: `userId` (String)
- **Sort Key**: `settingKey` (String)
- **Atrybuty**:
  - `value` - Wartość ustawienia
  - `lastUpdated` - Timestamp ostatniej aktualizacji

## Testowanie Konfiguracji

Po uruchomieniu aplikacji możesz przetestować konfigurację DynamoDB:

1. Otwórz Developer Tools w przeglądarce
2. Wykonaj w konsoli:
```javascript
// Sprawdź status tabel
await window.checkDynamoTablesStatus();

// Inicjalizuj tabele (jeśli potrzebne)
await window.initDynamoTables();
```

## Migracja z localStorage

Jeśli masz już dane w localStorage, zostaną one automatycznie zachowane przy pierwszym uruchomieniu z DynamoDB.

## Troubleshooting

### Problem: "ResourceNotFoundException"
- Sprawdź czy tabele zostały utworzone
- Sprawdź czy region AWS jest poprawny

### Problem: "AccessDeniedException"
- Sprawdź credentials AWS
- Sprawdź uprawnienia IAM dla DynamoDB

### Problem: "NetworkingError"
- Sprawdź czy DynamoDB Local działa (port 8000)
- Sprawdź połączenie internetowe dla AWS DynamoDB

## Koszty

- **DynamoDB Local**: Darmowy
- **AWS DynamoDB**: Pay-per-request (bardzo niskie koszty dla małych aplikacji)
  - Odczyt: $0.25 za milion requestów
  - Zapis: $1.25 za milion requestów