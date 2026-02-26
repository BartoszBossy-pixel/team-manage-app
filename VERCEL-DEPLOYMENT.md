# Instrukcje Deployment na Vercel

## 1. Przygotowanie projektu

Projekt został skonfigurowany do deployment na Vercel z następującymi zmianami:

### Struktura API
- Utworzono folder `api/` z serverless functions
- Przekształcono Express.js endpoints na Vercel API routes
- Dodano konfigurację CORS dla wszystkich endpoints

### Pliki konfiguracyjne
- `vercel.json` - konfiguracja Vercel
- API endpoints w folderze `api/`

## 2. Deployment na Vercel

### Krok 1: Połącz z GitHub
1. Zaloguj się na [vercel.com](https://vercel.com)
2. Kliknij "New Project"
3. Połącz swoje repozytorium GitHub
4. Wybierz projekt `team-manage-app`

### Krok 2: Konfiguracja Environment Variables
W ustawieniach projektu na Vercel dodaj następujące zmienne środowiskowe:

#### Jira Configuration
```
VITE_JIRA_DOMAIN=auctane.atlassian.net
VITE_JIRA_EMAIL=bartosz.bossy@auctane.com
VITE_JIRA_API_TOKEN=ATATT3xFfGF0v4U_VE8q8jM9RgM1J2YDHTwWtnQSsodkvvEtPzRTYUY0NX4ukK5IdAKpRw9xIc3th3GcsEOca9EEaVeKg8HfWRKozoKVUDH3t0CgNm3Yl5JqGg4n7jaNwUIjcpGGsLU_7IiKq4UpRG6XjO6Xe8Kv7QGG_eGbGNLq1nnFKriyTos=2545C298
VITE_JIRA_PROJECT_KEY=GOLD
VITE_GLOBAL_DELIVERY=Global Delivery
```

#### Team IDs
```
VITE_ID_ALICJA=557058:22f7c68d-94c8-4fc5-9f08-6b4ab5374c82
VITE_ID_RAKU=557058:41afc69b-a7a7-4c0c-a567-e8a546d839a2
VITE_ID_TOMEK=5d19ba6643d1510d3accd22d
VITE_ID_KRZYSIEK=557058:55341d8b-a3fe-491b-ab75-40d9e3170a3b
VITE_ID_OLIWER=712020:25d2841e-e973-410c-8305-848ec4228eb8
```

#### Team Configuration
```
VITE_TEAM_FIELD_NAME=Team
```

#### User Roles
```
VITE_ROLE_TOMASZ_RUSINSKI=Software Engineer
VITE_ROLE_BARTOSZ_BOSSY=Associate Manager, Engineering
VITE_ROLE_OLIWER_PAWELSKI=Associate Software Engineer
VITE_ROLE_KRZYSZTOF_RAK=Associate Software Engineer
VITE_ROLE_KRZYSZTOF_ADAMEK=Senior Software Engineer
VITE_ROLE_ALICJA_WOLNIK=Senior Software Engineer
```

#### **WAŻNE: API Base URL**
```
VITE_API_BASE_URL=https://twoja-domena.vercel.app
```
**Zastąp `twoja-domena` rzeczywistą domeną swojego projektu na Vercel!**

#### AWS DynamoDB (dla produkcji)
```
AWS_ACCESS_KEY_ID=twoj-aws-access-key
AWS_SECRET_ACCESS_KEY=twoj-aws-secret-key
AWS_REGION=us-east-1
```

#### Frontend DynamoDB Configuration
```
VITE_AWS_REGION=us-east-1
VITE_DYNAMODB_USERS_TABLE=Users
VITE_DYNAMODB_USER_SETTINGS_TABLE=TableSettings
```

### Krok 3: Deploy
1. Kliknij "Deploy"
2. Vercel automatycznie zbuduje i wdroży aplikację
3. Po deployment otrzymasz URL do swojej aplikacji

## 3. Po deployment

### Aktualizacja API Base URL
Po otrzymaniu URL od Vercel (np. `https://team-manage-app-xyz.vercel.app`):

1. Wróć do ustawień Environment Variables w Vercel
2. Zaktualizuj `VITE_API_BASE_URL` na właściwy URL:
   ```
   VITE_API_BASE_URL=https://team-manage-app-xyz.vercel.app
   ```
3. Redeploy aplikację

### Konfiguracja DynamoDB
Dla produkcji musisz:
1. Utworzyć tabele DynamoDB w AWS
2. Skonfigurować właściwe AWS credentials
3. Usunąć `AWS_ENDPOINT_URL` (używane tylko lokalnie)

## 4. Dostępne API Endpoints

Po deployment będą dostępne następujące endpoints:

- `GET /api/jira-search` - Wyszukiwanie issues w Jira
- `GET /api/jira-in-progress` - Issues w trakcie dla zespołu
- `GET /api/jira-project/[projectKey]` - Informacje o projekcie
- `GET /api/jira-issue-types` - Typy issues
- `GET /api/users` - Lista użytkowników
- `POST /api/users` - Dodawanie użytkowników
- `GET /api/users/[userId]` - Konkretny użytkownik
- `PUT /api/users/[userId]` - Aktualizacja użytkownika
- `DELETE /api/users/[userId]` - Usuwanie użytkownika
- `GET /api/table-settings/[tableType]` - Ustawienia tabeli
- `POST /api/table-settings` - Zapisywanie ustawień tabeli

## 5. Troubleshooting

### Problem z CORS
Jeśli wystąpią problemy z CORS, sprawdź czy wszystkie API endpoints mają poprawnie skonfigurowane headers.

### Problem z Environment Variables
Upewnij się, że wszystkie zmienne środowiskowe są poprawnie skonfigurowane w ustawieniach Vercel.

### Problem z DynamoDB
Dla lokalnego testowania użyj DynamoDB Local, dla produkcji skonfiguruj prawdziwe AWS DynamoDB.

### Problem z undefined w JQL queries
Jeśli widzisz `undefined` w zapytaniach JQL (np. `assignee in(undefined,undefined,...)`), oznacza to że niektóre zmienne środowiskowe z ID zespołu nie są poprawnie skonfigurowane. Upewnij się, że wszystkie zmienne `ID_*` są poprawnie ustawione w Vercel Environment Variables.

### Problem z nieistniejącymi zmiennymi środowiskowymi
Kod automatycznie filtruje nieistniejące lub undefined wartości ID użytkowników, więc zapytania JQL będą zawierać tylko prawidłowe ID.