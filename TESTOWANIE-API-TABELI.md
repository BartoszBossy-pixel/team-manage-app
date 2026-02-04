# Testowanie API dla Ustawień Tabel

## Przegląd
System został zaktualizowany aby InProgressTable zapisywała ustawienia do DynamoDB przez API serwera zamiast bezpośredniego połączenia z frontendu.

## Hierarchia Repository
1. **API Repository** (priorytet 1) - komunikacja z DynamoDB przez serwer
2. **Direct DynamoDB Repository** (priorytet 2) - bezpośrednie połączenie z DynamoDB
3. **LocalStorage Repository** (priorytet 3) - fallback

## Kroki Testowania

### 1. Uruchom System
```bash
# Terminal 1: Uruchom DynamoDB Local
npm run docker:up

# Terminal 2: Uruchom serwer backend
npm run server

# Terminal 3: Uruchom frontend
npm run dev
```

### 2. Sprawdź Logi w Konsoli Przeglądarki
Otwórz DevTools (F12) i sprawdź logi:

**Oczekiwane logi dla InProgressTable:**
```
[TableSettingsController] Initializing repository for inprogress
[TableSettingsController] Attempting to use API repository for inprogress
[API] Server not available: [lub sukces]
[TableSettingsController] Using API repository for inprogress
```

**Oczekiwane logi dla innych tabel:**
```
[TableSettingsController] Using localStorage for awaiting-prod
[TableSettingsController] Using localStorage for to-take
```

### 3. Testuj Zapisywanie Ustawień InProgressTable

1. **Przejdź do zakładki "In Progress"**
2. **Zmień filtry** (np. assignee, status)
3. **Sprawdź logi w konsoli:**
   ```
   [TableSettingsController] updateFilters called for inprogress
   [API] Saved table settings for inprogress to DynamoDB via API
   ```

4. **Odśwież stronę** i sprawdź czy filtry zostały zachowane

### 4. Sprawdź DynamoDB Admin UI

1. **Otwórz** http://localhost:8001
2. **Przejdź do tabeli** `TableSettings`
3. **Sprawdź czy** pojawiły się nowe rekordy z `id: "inprogress"`

### 5. Testuj Inne Tabele (localStorage)

1. **Przejdź do** "Awaiting Prod" lub "To Take"
2. **Zmień ustawienia** (filtry, sortowanie)
3. **Sprawdź logi:**
   ```
   [TableSettingsController] Using localStorage repository for awaiting-prod
   [LocalStorage] Saved table settings for awaiting-prod
   ```

4. **Odśwież stronę** - ustawienia powinny być zachowane w localStorage

## Rozwiązywanie Problemów

### Problem: API Repository nie działa
**Logi:**
```
[API] Server not available: Error
[TableSettingsController] API error for inprogress, trying direct DynamoDB
```

**Rozwiązanie:**
1. Sprawdź czy serwer działa na porcie 3001
2. Sprawdź endpoint: http://localhost:3001/health
3. Sprawdź zmienną `VITE_API_BASE_URL` w .env

### Problem: DynamoDB nie działa
**Logi:**
```
[TableSettingsController] DynamoDB not available for inprogress, falling back to localStorage
```

**Rozwiązanie:**
1. Sprawdź czy Docker działa: `docker ps`
2. Sprawdź czy DynamoDB Local odpowiada: http://localhost:8000
3. Uruchom ponownie: `npm run docker:restart`

### Problem: Brak zapisywania ustawień
**Sprawdź:**
1. Czy nie ma błędów w konsoli
2. Czy endpoint `/api/table-settings` odpowiada
3. Czy tabela `TableSettings` istnieje w DynamoDB

## Oczekiwane Zachowanie

| Tabela | Storage | Lokalizacja Danych |
|--------|---------|-------------------|
| InProgressTable | DynamoDB (przez API) | Tabela `TableSettings` |
| AwaitingProdTable | localStorage | Browser localStorage |
| ToTakeTable | localStorage | Browser localStorage |

## Weryfikacja Sukcesu

✅ **InProgressTable** zapisuje do DynamoDB przez API  
✅ **Inne tabele** zapisują do localStorage  
✅ **Ustawienia** są zachowywane po odświeżeniu  
✅ **Fallback** działa gdy API/DynamoDB niedostępne  
✅ **Logi** pokazują prawidłowy przepływ danych  

## Następne Kroki

Po pomyślnym testowaniu:
1. Usuń stare pliki debugowania jeśli nie są potrzebne
2. Zaktualizuj dokumentację projektu
3. Rozważ dodanie testów jednostkowych dla API repository