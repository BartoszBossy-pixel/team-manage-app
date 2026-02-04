# 🚀 Szybki Start - KPI Dashboard

## ⚡ Uruchomienie BEZ Dockera (Zalecane)

Docker nie jest wymagany! Aplikacja automatycznie przełączy się na localStorage:

```bash
# 1. Uruchom aplikację (bez Dockera)
npm run start
```

To wszystko! 🎉

## 📱 Co się stanie:

1. **Serwer** uruchomi się na http://localhost:3001
2. **Frontend** uruchomi się na http://localhost:3000  
3. **Ustawienia tabel** będą zapisywane w localStorage
4. **Dane użytkowników** będą zapisywane w localStorage
5. **Wszystko działa identycznie** jak z DynamoDB!

## 🔧 Jeśli Port 3000 jest zajęty:

```bash
# Znajdź proces na porcie 3000
lsof -ti:3000

# Zabij proces (zastąp XXXX numerem z poprzedniej komendy)
kill -9 XXXX

# Lub uruchom na innym porcie
PORT=3002 npm run dev
```

## 🐳 Opcjonalnie: Z Dockerem (jeśli chcesz)

Jeśli chcesz używać DynamoDB Local:

1. **Uruchom Docker Desktop** (aplikacja na Macu)
2. Poczekaj aż się uruchomi (ikona wieloryba w pasku menu)
3. Wtedy uruchom:
```bash
npm run start:with-db
```

## ✅ Sprawdź czy działa:

1. Otwórz http://localhost:3000
2. Kliknij ikonę użytkowników w menu bocznym
3. Zmień kolor avatara użytkownika
4. Odśwież stronę - kolor powinien się zachować
5. Zmień filtry w tabelach
6. Odśwież stronę - filtry powinny się zachować

## 🎯 Gotowe!

Aplikacja jest w pełni funkcjonalna bez Dockera. Wszystkie ustawienia będą zapisywane lokalnie w przeglądarce.