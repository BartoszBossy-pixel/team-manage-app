# 🚀 Instrukcje Uruchomienia KPI Dashboard

## ⚡ Szybki Start (bez Dockera)

Jeśli nie masz Dockera lub nie chcesz go używać, aplikacja automatycznie przełączy się na localStorage:

```bash
# 1. Zainstaluj zależności (jeśli jeszcze nie zrobiłeś)
npm install

# 2. Uruchom aplikację
npm run start
```

Aplikacja będzie dostępna na:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 🐳 Z Dockerem (opcjonalnie)

Jeśli masz Dockera i chcesz używać DynamoDB Local:

```bash
# Uruchom wszystko jedną komendą
npm run start:with-db
```

Lub krok po kroku:
```bash
# 1. Uruchom DynamoDB Local
npm run docker:up

# 2. Zainicjalizuj tabele
npm run init-db

# 3. Uruchom aplikację
npm run start
```

## 🔧 Rozwiązywanie Problemów

### Problem: "Port 3000 is already in use"
```bash
# Znajdź proces używający portu 3000
lsof -ti:3000

# Zabij proces (zastąp PID numerem z poprzedniej komendy)
kill -9 PID
```

### Problem: "Docker daemon is not running"
1. Uruchom Docker Desktop
2. Lub użyj aplikacji bez Dockera: `npm run start`

### Problem: Aplikacja nie łączy się z Jira
1. Sprawdź plik `.env` - skopiuj z `.env.example`
2. Uzupełnij dane Jira:
   ```bash
   JIRA_BASE_URL=https://twoja-firma.atlassian.net
   JIRA_EMAIL=twoj-email@firma.com
   JIRA_API_TOKEN=twoj-api-token
   JIRA_PROJECT_KEY=TWOJ-PROJEKT
   ```

## 📊 Funkcjonalności

### ✅ Zarządzanie Użytkownikami
- Spersonalizowane avatary z kolorami
- Edycja danych użytkowników
- Automatyczne pobieranie z Jira
- Persystencja w localStorage/DynamoDB

### ✅ Zarządzanie Ustawieniami Tabel
- **InProgressTable**: Ustawienia globalne (DynamoDB/localStorage)
- **AwaitingProdTable**: Ustawienia per operator (localStorage)
- **ToTakeTable**: Ustawienia per operator (localStorage)
- Zapisywanie filtrów, sortowania, szerokości kolumn

### ✅ Integracja z Jira
- Pobieranie zadań z różnych statusów
- Automatyczne odświeżanie danych
- Obsługa ról projektowych
- Filtrowanie po assignee

## 🗂️ Struktura Danych

### localStorage (zawsze dostępne)
```javascript
// Użytkownicy
localStorage.getItem('kpi_users')

// Ustawienia tabel (AwaitingProd i ToTake)
localStorage.getItem('table_settings_awaiting_prod_[operator]')
localStorage.getItem('table_settings_to_take_[operator]')
```

### DynamoDB (gdy Docker działa)
- Tabela `Users` - dane użytkowników
- Tabela `TableSettings` - ustawienia InProgressTable

## 🎯 Testowanie

1. **Uruchom aplikację**: `npm run start`
2. **Otwórz**: http://localhost:3000
3. **Sprawdź zarządzanie użytkownikami**: Kliknij ikonę użytkowników w menu
4. **Przetestuj tabele**: Zmień filtry, sortowanie, szerokości kolumn
5. **Odśwież stronę**: Sprawdź czy ustawienia się zachowały

## 🔍 Debug

### API Endpoints
```bash
# Sprawdź status serwera
curl http://localhost:3001/health

# Zobacz zawartość bazy danych
curl http://localhost:3001/api/debug/database

# Pobierz zadania z Jira
curl http://localhost:3001/api/jira-in-progress
```

### Logi przeglądarki
1. Otwórz DevTools (F12)
2. Sprawdź zakładkę Console
3. Sprawdź zakładkę Network dla requestów API

## 🚀 Deployment

### Darmowe opcje:
1. **Vercel** (frontend) + **Railway** (backend)
2. **Netlify** (frontend) + **Render** (backend)
3. **GitHub Pages** (frontend) + **Heroku** (backend)

### Z Dockerem:
1. **Railway.app** - automatycznie wykryje docker-compose.yml
2. **Render.com** - obsługuje Docker
3. **Fly.io** - pełna obsługa kontenerów

## 📝 Konfiguracja Środowiska

Plik `.env` (skopiuj z `.env.example`):
```bash
# Jira Configuration
JIRA_BASE_URL=https://twoja-firma.atlassian.net
JIRA_EMAIL=twoj-email@firma.com
JIRA_API_TOKEN=twoj-api-token
JIRA_PROJECT_KEY=TWOJ-PROJEKT

# AWS DynamoDB Local (opcjonalne, tylko z Dockerem)
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:8000
```

## ✨ Gotowe!

Aplikacja jest w pełni funkcjonalna i gotowa do użycia. Wszystkie funkcjonalności działają zarówno z Dockerem jak i bez niego.