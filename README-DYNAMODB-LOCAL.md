# DynamoDB Local Setup z Dockerem

## 🚀 Szybki Start

### 1. Uruchom wszystko jedną komendą:
```bash
npm run start:with-db
```

Ta komenda:
- Uruchamia DynamoDB Local w Dockerze
- Inicjalizuje tabele
- Uruchamia serwer i aplikację React

### 2. Lub krok po kroku:

#### Uruchom DynamoDB Local:
```bash
npm run docker:up
```

#### Zainicjalizuj tabele:
```bash
npm run init-db
```

#### Uruchom aplikację:
```bash
npm run start
```

## 🔧 Dostępne Komendy

| Komenda | Opis |
|---------|------|
| `npm run docker:up` | Uruchamia DynamoDB Local w tle |
| `npm run docker:down` | Zatrzymuje DynamoDB Local |
| `npm run docker:logs` | Pokazuje logi DynamoDB |
| `npm run init-db` | Tworzy tabele w DynamoDB Local |
| `npm run start:with-db` | Uruchamia wszystko (DB + App) |

## 🌐 Dostępne Endpointy

- **DynamoDB Local**: http://localhost:8000
- **DynamoDB Admin UI**: http://localhost:8001
- **API Debug**: http://localhost:3001/api/debug/database
- **Aplikacja**: http://localhost:3000

## 📊 DynamoDB Admin UI

Otwórz http://localhost:8001 żeby zobaczyć graficzny interfejs do zarządzania tabelami DynamoDB.

## 🗃️ Struktura Tabel

### Users
- **Klucz główny**: `id` (String)
- **Zawiera**: dane użytkowników, kolory avatarów, role

### TableSettings  
- **Klucz główny**: `id` (String)
- **Zawiera**: ustawienia tabel (filtry, sortowanie, szerokości kolumn)

## 💾 Persystencja Danych

Dane są zapisywane w folderze `./docker/dynamodb/` i będą zachowane między restartami.

## 🔍 Sprawdzanie Zawartości Bazy

### Przez API:
```bash
curl http://localhost:3001/api/debug/database
```

### Przez Admin UI:
Otwórz http://localhost:8001

## 🛠️ Rozwiązywanie Problemów

### DynamoDB nie startuje:
```bash
npm run docker:down
npm run docker:up
```

### Tabele nie istnieją:
```bash
npm run init-db
```

### Sprawdź logi:
```bash
npm run docker:logs
```

## 🚀 Deployment na Darmowy Serwer

### Opcja 1: Railway.app
1. Połącz z GitHub
2. Dodaj zmienne środowiskowe z `.env`
3. Railway automatycznie wykryje `docker-compose.yml`

### Opcja 2: Render.com
1. Utwórz Web Service z GitHub
2. Ustaw Build Command: `npm install && npm run build`
3. Ustaw Start Command: `npm run start:with-db`

### Opcja 3: Fly.io
1. `flyctl launch`
2. Skonfiguruj `fly.toml` z DynamoDB Local
3. `flyctl deploy`

## 📝 Konfiguracja Środowiska

Plik `.env` zawiera:
```bash
# AWS DynamoDB Local Configuration (Docker)
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:8000
```

## 🔄 Migracja na AWS DynamoDB

Aby przejść na prawdziwy AWS DynamoDB:
1. Usuń `AWS_ENDPOINT_URL` z `.env`
2. Ustaw prawdziwe `AWS_ACCESS_KEY_ID` i `AWS_SECRET_ACCESS_KEY`
3. Uruchom aplikację - automatycznie przełączy się na AWS

## 🎯 Zalety Tego Rozwiązania

✅ **Darmowe** - nie potrzebujesz konta AWS  
✅ **Lokalne** - wszystko działa offline  
✅ **Szybkie** - brak opóźnień sieciowych  
✅ **Łatwe deployment** - jeden `docker-compose.yml`  
✅ **Kompatybilne** - identyczne API jak prawdziwy DynamoDB  
✅ **Skalowalne** - łatwa migracja na AWS w przyszłości  