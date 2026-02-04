# 🚀 Quick Start Guide

## Szybkie uruchomienie w 3 krokach:

### 1. Zainstaluj zależności
```bash
npm install
```

### 2. Skonfiguruj Jira
```bash
# Skopiuj plik konfiguracyjny
cp .env.example .env

# Edytuj .env i wypełnij:
# - VITE_JIRA_DOMAIN (np. twoja-firma.atlassian.net)
# - VITE_JIRA_EMAIL (twój email)
# - VITE_JIRA_API_TOKEN (token z https://id.atlassian.com/manage-profile/security/api-tokens)
# - VITE_JIRA_PROJECT_KEY (klucz projektu, np. GOLD, PROJ)
```

### 3. Uruchom aplikację
```bash
npm run start
```

## 🎯 Gotowe!
- **Dashboard:** http://localhost:3000
- **API Proxy:** http://localhost:3001

## 🔧 Alternatywne sposoby uruchamiania:

### Z kolorowymi logami:
```bash
npm run start:dev
```

### Linux/Mac:
```bash
chmod +x start.sh && ./start.sh
```

### Windows:
```cmd
start.bat
```

## 🆘 Problemy?

### Błąd autoryzacji:
- Sprawdź token API w .env
- Upewnij się że masz dostęp do projektu

### Port zajęty:
- Aplikacja automatycznie znajdzie wolny port
- Sprawdź logi w terminalu

### Cache przeglądarki:
- Naciśnij Ctrl+Shift+R żeby wyczyścić cache

## 📊 Co zobaczysz:
- Podział pracy 30/70 (Utrzymanie vs Nowy Produkt)
- Średni Cycle Time
- Throughput zespołu
- Interaktywne wykresy
- Analiza typów zadań