# 📊 KPI Dashboard - Podsumowanie Projektu

## 🎯 Cel projektu
Dashboard do analizy KPI zespołu deweloperskiego z automatycznym obliczaniem podziału pracy 30/70 (Utrzymanie vs Nowy Produkt) na podstawie danych z Jira.

## 🏗️ Architektura

### Frontend (React + TypeScript + Vite)
- **Framework:** React 18 z TypeScript
- **Build Tool:** Vite (szybki development)
- **Wykresy:** Recharts (interaktywne wykresy)
- **Styling:** CSS z responsywnym designem
- **Port:** 3000

### Backend (Node.js Proxy)
- **Framework:** Express.js
- **Cel:** Rozwiązanie problemów CORS z Jira API
- **Endpointy:** `/api/jira-search`, `/api/jira-project`, `/api/jira-issue-types`
- **Port:** 3001

## 📁 Struktura plików

```
KPI-dashboard/
├── src/
│   ├── api/
│   │   └── jiraClient.ts          # Klient API Jira
│   ├── utils/
│   │   └── kpiEngine.ts           # Logika obliczania KPI
│   ├── App.tsx                    # Główny komponent UI
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Style CSS
├── server.js                      # Proxy serwer Express
├── package.json                   # Zależności i skrypty
├── .env.example                   # Szablon konfiguracji
├── .env                          # Konfiguracja Jira (gitignored)
├── start.sh                      # Skrypt uruchomieniowy (Unix/Mac)
├── start.bat                     # Skrypt uruchomieniowy (Windows)
├── README.md                     # Pełna dokumentacja
├── QUICKSTART.md                 # Szybki start
└── PROJECT_SUMMARY.md            # Ten plik
```

## 🔧 Kluczowe funkcjonalności

### 1. Automatyczna kategoryzacja zadań
- **Utrzymanie:** Bug, Support, Incident, Hotfix, Technical Debt
- **Nowy Produkt:** Story, Feature, Epic, Task, Improvement

### 2. Obliczanie metryk KPI
- **Podział 30/70:** Procent zadań utrzymania vs nowy produkt
- **Cycle Time:** Średni czas od utworzenia do zamknięcia
- **Throughput:** Liczba ukończonych zadań na tydzień
- **Analiza typów:** Szczegółowy podział według typów zadań

### 3. Wizualizacja danych
- **Wykres kołowy:** Podział 30/70 z procentami
- **Wykres słupkowy:** Rozkład typów zadań
- **Metryki:** Kluczowe wskaźniki w kartach
- **Analiza celu:** Porównanie z założonym celem 30/70

## 🚀 Sposoby uruchomienia

### Najprościej (jedna komenda):
```bash
npm run start
```

### Z kolorowymi logami:
```bash
npm run start:dev
```

### Skrypty systemowe:
```bash
./start.sh        # Unix/Mac
start.bat         # Windows
```

## 🔐 Konfiguracja

### Wymagane zmienne w .env:
- `VITE_JIRA_DOMAIN` - Domena Jira (np. firma.atlassian.net)
- `VITE_JIRA_EMAIL` - Email użytkownika
- `VITE_JIRA_API_TOKEN` - Token API z Atlassian
- `VITE_JIRA_PROJECT_KEY` - Klucz projektu (np. GOLD, PROJ)

### Generowanie tokena API:
1. Idź do https://id.atlassian.com/manage-profile/security/api-tokens
2. Kliknij "Create API token"
3. Nadaj nazwę i skopiuj token

## 📊 Przykładowe dane wyjściowe

```json
{
  "distribution": {
    "newProduct": 72.5,
    "maintenance": 27.5
  },
  "avgCycleTime": "8.3",
  "totalTasks": 156,
  "completedTasks": 142,
  "throughput": 12.4,
  "maintenanceTypes": {
    "Bug": 28,
    "Support": 12,
    "Incident": 3
  },
  "newProductTypes": {
    "Story": 67,
    "Feature": 23,
    "Task": 23
  }
}
```

## 🛠️ Technologie użyte

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Recharts** - Wykresy
- **Express.js** - Proxy serwer
- **Axios** - HTTP client
- **Concurrently** - Równoległe uruchamianie serwerów

## 🔄 Proces rozwoju

1. ✅ Analiza wymagań i projektowanie architektury
2. ✅ Stworzenie struktury projektu (Vite + React + TS)
3. ✅ Implementacja klienta Jira API z TypeScript
4. ✅ Stworzenie silnika obliczającego KPI
5. ✅ Implementacja komponentów UI z wykresami
6. ✅ Stworzenie proxy serwera dla CORS
7. ✅ Konfiguracja zmiennych środowiskowych
8. ✅ Testowanie i debugowanie
9. ✅ Stworzenie skryptów uruchomieniowych
10. ✅ Dokumentacja i instrukcje

## 🎉 Status: GOTOWY DO UŻYCIA

Dashboard jest w pełni funkcjonalny i gotowy do analizy KPI zespołu deweloperskiego!