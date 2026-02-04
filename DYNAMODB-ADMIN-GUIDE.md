# 🎨 DynamoDB Admin UI - Jak Przeglądać Tabele

## 🌐 Otwórz: http://localhost:8001

## 📋 Krok po kroku:

### 1. **Wybierz Tabelę**
Na stronie głównej zobaczysz listę tabel:
- `Users`
- `TableSettings`

### 2. **Kliknij na nazwę tabeli** (np. `Users`)

### 3. **Zobaczysz zawartość tabeli**
- Wszystkie rekordy w tabeli
- Kolumny z danymi
- Możliwość dodawania/edycji/usuwania

### 4. **Żeby zobaczyć WSZYSTKIE rekordy:**
- Tabele mogą być puste na początku (to normalne)
- Dane pojawią się po użyciu aplikacji
- Kliknij **"Scan"** żeby odświeżyć widok

## 🔍 Co zobaczysz:

### Tabela `Users`:
```json
{
  "id": "user123",
  "displayName": "Jan Kowalski", 
  "email": "jan@example.com",
  "avatarColor": "#FF5733",
  "role": "Developer"
}
```

### Tabela `TableSettings`:
```json
{
  "id": "in_progress_global",
  "filters": {
    "assignee": "all",
    "status": "In Progress"
  },
  "sorting": {
    "column": "created",
    "direction": "desc"
  },
  "columnWidths": {
    "key": 15,
    "summary": 30,
    "assignee": 20
  }
}
```

## 🎯 Przydatne Przyciski:

- **"Scan"** - pokaż wszystkie rekordy
- **"Query"** - wyszukaj konkretne rekordy  
- **"Create Item"** - dodaj nowy rekord
- **"Delete"** - usuń rekord

## ⚠️ Jeśli tabele są puste:

To normalne na początku! Dane pojawią się gdy:
1. Uruchomisz aplikację (`npm run dev`)
2. Użyjesz funkcji zarządzania użytkownikami
3. Zmienisz ustawienia tabel

## 🚀 Test:

1. Otwórz http://localhost:8001
2. Kliknij na `Users`
3. Kliknij **"Scan"**
4. Zobaczysz zawartość (może być pusta na początku)