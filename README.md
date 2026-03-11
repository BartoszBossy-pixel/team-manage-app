# KPI Dashboard - Engineering Team Analytics

Dashboard do analizy KPI zespołu deweloperskiego z integracją z Jira. Aplikacja automatycznie oblicza podział pracy między nowy produkt a utrzymanie (cel 30/70), cycle time i inne kluczowe metryki.

## 🚀 Funkcjonalności

- **Podział pracy 30/70**: Automatyczna analiza podziału między utrzymanie a nowy produkt
- **Cycle Time**: Obliczanie średniego czasu realizacji zadań
- **Throughput**: Przepustowość zespołu (zadania/tydzień)
- **Wizualizacje**: Wykresy kołowe i słupkowe z interaktywnymi danymi
- **Real-time**: Odświeżanie danych na żądanie
- **Kategoryzacja**: Automatyczne grupowanie typów zadań
- **Tabela In Progress**: Lista aktualnie realizowanych zadań zespołu

## 📋 Wymagania

- Node.js (wersja 16 lub wyższa)
- npm lub yarn
- Konto Jira z dostępem do API
- Token API Jira

## 🔧 Instalacja

### Krok 1: Klonowanie i instalacja zależności

```bash
# Instalacja zależności dla aplikacji React
npm install

# Instalacja zależności dla serwera proxy
npm install express axios cors nodemon
```

### Krok 2: Konfiguracja Jira API

1. **Wygeneruj API Token w Jira:**
   - Zaloguj się na [id.atlassian.com](https://id.atlassian.com)
   - Kliknij "Create API token"
   - Nadaj nazwę (np. "KPI-Dashboard-App")
   - Skopiuj token (nie zobaczysz go drugi raz!)

2. **Skonfiguruj zmienne środowiskowe:**
   ```bash
   # Skopiuj plik przykładowy
   cp .env.example .env
   ```

3. **Wypełnij plik .env:**
   ```env
   VITE_JIRA_DOMAIN=twoja-domena.atlassian.net
   VITE_JIRA_EMAIL=twoj-email@example.com
   VITE_JIRA_API_TOKEN=twoj-api-token
   VITE_JIRA_PROJECT_KEY=KLUCZ_PROJEKTU
   VITE_API_BASE_URL=http://localhost:3000
   ```

### Krok 3: Uruchomienie aplikacji

#### 🚀 Opcja 1: Jedna komenda (zalecane)
```bash
npm run start
```

#### 🎨 Opcja 2: Z kolorowymi logami
```bash
npm run start:dev
```

#### 📜 Opcja 3: Skrypty systemowe
**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

#### 🔧 Opcja 4: Ręcznie (dwa terminale)
**Terminal 1 - Serwer Proxy (port 3001):**
```bash
node server.js
```

**Terminal 2 - Aplikacja React (port 3000):**
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

## 🏗️ Struktura projektu

```
kpi-dashboard/
├── src/
│   ├── api/
│   │   └── jiraClient.ts      # Klient API Jira
│   ├── components/
│   │   └── InProgressTable.tsx # Tabela zadań In Progress
│   ├── utils/
│   │   └── kpiEngine.ts       # Logika obliczania KPI
│   ├── App.tsx                # Główny komponent
│   ├── main.tsx               # Entry point
│   └── index.css              # Style
├── server.js                  # Serwer proxy dla CORS
├── start.sh                   # Skrypt uruchomieniowy (Unix/Mac)
├── start.bat                  # Skrypt uruchomieniowy (Windows)
├── .env.example               # Przykład konfiguracji
├── package.json               # Zależności React
├── QUICKSTART.md              # Szybki przewodnik
└── README.md                  # Ta dokumentacja
```

## 📊 Jak działa kategoryzacja

### Utrzymanie (Maintenance):
- Bug
- Support  
- Incident
- Hotfix
- Technical Debt
- Maintenance

### Nowy Produkt (New Product):
- Story
- Feature
- Epic
- Task
- Improvement
- New Feature

## 🔍 Metryki KPI

1. **Podział 30/70**: Procent zadań utrzymania vs nowy produkt
2. **Cycle Time**: Średni czas od utworzenia do zamknięcia zadania
3. **Throughput**: Liczba ukończonych zadań na tydzień
4. **Analiza typów**: Szczegółowy podział według typów zadań
5. **Zadania In Progress**: Tabela z aktualnymi zadaniami zespołu zawierająca:
   - Klucz zadania (link do Jira)
   - Tytuł i typ zadania z kolorowym oznaczeniem
   - Priorytet z kolorowym wskaźnikiem
   - Przypisana osoba z awatarem
   - Data utworzenia
   - Liczba dni w toku (z alertami dla długotrwałych zadań)

## 🛠️ Rozwiązywanie problemów

### Problem z CORS
Aplikacja używa serwera proxy na porcie 3001 do obsługi CORS. Upewnij się, że:
- Serwer proxy działa na porcie 3001
- Aplikacja React działa na porcie 3000
- Oba serwery są uruchomione jednocześnie

### Błędy autoryzacji
- Sprawdź poprawność domeny Jira (bez https://)
- Zweryfikuj email i API token
- Upewnij się, że masz dostęp do projektu

### Brak danych
- Sprawdź klucz projektu w .env
- Upewnij się, że projekt zawiera zadania z ostatnich 90 dni
- Zweryfikuj uprawnienia do projektu

## 🚀 Deployment

### Produkcja
1. Skonfiguruj zmienne środowiskowe na serwerze
2. Zbuduj aplikację: `npm run build`
3. Uruchom serwer proxy z odpowiednimi ustawieniami CORS
4. Serwuj pliki statyczne z folderu `dist`

### Docker (opcjonalnie)
```dockerfile
# Przykład Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000 3001
CMD ["npm", "run", "server"]
```

## 📈 Rozszerzenia

Możliwe ulepszenia:
- Filtrowanie według dat
- Eksport danych do CSV/PDF
- Alerty przy odchyleniach od celu 30/70
- Integracja z innymi narzędziami (GitHub, GitLab)
- Dashboard dla wielu projektów
- Historyczne trendy KPI

## 🤝 Deploy to vercel
npx vercel --prod

## 🤝 Wsparcie

W przypadku problemów:
1. Sprawdź logi w konsoli przeglądarki
2. Zweryfikuj logi serwera proxy
3. Upewnij się, że wszystkie zmienne środowiskowe są ustawione
4. Sprawdź połączenie z Jira API

## 📄 Licencja

MIT License - możesz swobodnie używać i modyfikować kod.