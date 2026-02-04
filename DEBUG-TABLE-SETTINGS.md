# 🐛 Debug - Ustawienia Tabel

## 🔍 Jak Sprawdzić Co Się Dzieje

### 1. Otwórz DevTools (F12)
- Przejdź do zakładki **Console**
- Odśwież stronę żeby zobaczyć logi ładowania

### 2. Zmień Filtr w InProgressTable
- Kliknij przycisk filtrów (ikona lupy)
- Zmień jakiś filtr (np. status)
- Sprawdź w konsoli czy widzisz logi:

```
[useTableSettings] Updating filters for in-progress: {...}
[TableSettingsController] updateFilters called for in-progress: {...}
[TableSettingsController] Current settings for in-progress: {...}
[TableSettingsController] Updated settings for in-progress: {...}
[TableSettingsController] Settings saved for in-progress
[LocalStorage] Saved table settings for in-progress
```

### 3. Sprawdź localStorage
W konsoli wpisz:
```javascript
// Sprawdź czy są zapisane ustawienia
localStorage.getItem('kpi-dashboard-table-settings-in-progress')

// Zobacz wszystkie klucze localStorage
Object.keys(localStorage).filter(key => key.includes('kpi'))
```

### 4. Sprawdź DynamoDB (jeśli Docker działa)
- Otwórz: http://localhost:8001
- Kliknij na tabelę `TableSettings`
- Kliknij **"Scan"**
- Sprawdź czy jest rekord z `id: "in-progress"`

### 5. Sprawdź Network
- Przejdź do zakładki **Network** w DevTools
- Zmień filtr
- Sprawdź czy są jakieś requesty HTTP (nie powinno być dla localStorage)

## 🚨 Możliwe Problemy

### Problem 1: Brak logów w konsoli
**Oznacza:** Hook nie jest wywoływany
**Rozwiązanie:** Sprawdź czy InProgressTable używa `useTableSettings('in-progress')`

### Problem 2: Błąd w konsoli
**Oznacza:** Problem z kodem
**Rozwiązanie:** Skopiuj błąd i sprawdź który plik/linia

### Problem 3: Logi są ale localStorage pusty
**Oznacza:** Problem z zapisywaniem
**Rozwiązanie:** Sprawdź czy localStorage nie jest zablokowany

### Problem 4: DynamoDB nie działa
**Oznacza:** Fallback na localStorage
**Rozwiązanie:** To normalne, sprawdź localStorage

## 🔧 Szybki Test

Wklej to w konsoli żeby przetestować localStorage:
```javascript
// Test zapisu
localStorage.setItem('test-table-settings', JSON.stringify({test: 'data'}));

// Test odczytu
console.log('Test:', localStorage.getItem('test-table-settings'));

// Usuń test
localStorage.removeItem('test-table-settings');
```

## 📋 Checklist Debugowania

- [ ] DevTools otwarte
- [ ] Konsola czysta (bez błędów)
- [ ] Zmieniono filtr w tabeli
- [ ] Sprawdzono logi w konsoli
- [ ] Sprawdzono localStorage
- [ ] Odświeżono stronę i sprawdzono czy filtr się zachował

## 🆘 Jeśli Nic Nie Działa

Sprawdź czy:
1. Aplikacja jest uruchomiona (`npm run dev`)
2. Nie ma błędów w konsoli
3. InProgressTable jest widoczna na stronie
4. Filtry są dostępne (przycisk lupy)

**Wyślij screenshot konsoli z błędami jeśli są!**