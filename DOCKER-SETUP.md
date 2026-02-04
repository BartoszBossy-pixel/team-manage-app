# 🐳 Jak Uruchomić Docker z DynamoDB Local

## 1. 📥 Zainstaluj Docker Desktop

### Na macOS:
1. Pobierz Docker Desktop z: https://www.docker.com/products/docker-desktop/
2. Zainstaluj aplikację
3. Uruchom Docker Desktop (ikona wieloryba w pasku menu)
4. Poczekaj aż status zmieni się na "Docker Desktop is running"

### Sprawdź czy Docker działa:
```bash
docker --version
docker-compose --version
```

## 2. 🚀 Uruchom DynamoDB Local

### Opcja A: Wszystko jedną komendą
```bash
npm run start:with-db
```

### Opcja B: Krok po kroku
```bash
# 1. Uruchom DynamoDB Local w tle
npm run docker:up

# 2. Sprawdź czy kontenery działają
docker ps

# 3. Zainicjalizuj tabele
npm run init-db

# 4. Uruchom aplikację
npm run start
```

## 3. 🔍 Sprawdź czy działa

### Dostępne endpointy:
- **DynamoDB Local**: http://localhost:8000
- **DynamoDB Admin UI**: http://localhost:8001
- **Aplikacja**: http://localhost:3000
- **API**: http://localhost:3001

### Sprawdź tabele:
```bash
# Przez API
curl http://localhost:3001/api/debug/database

# Lub otwórz w przeglądarce
open http://localhost:8001
```

## 4. 🛠️ Komendy Docker

```bash
# Uruchom kontenery
npm run docker:up

# Zatrzymaj kontenery
npm run docker:down

# Zobacz logi
npm run docker:logs

# Sprawdź status kontenerów
docker ps

# Zrestartuj kontenery
npm run docker:down && npm run docker:up
```

## 5. 🗂️ Struktura Folderów

Po uruchomieniu Docker utworzy:
```
./docker/
└── dynamodb/          # Dane DynamoDB (persystentne)
    ├── shared-local-instance.db
    └── inne pliki...
```

## 6. 🔧 Rozwiązywanie Problemów

### Problem: "Cannot connect to Docker daemon"
```bash
# Sprawdź czy Docker Desktop jest uruchomiony
docker info

# Jeśli nie, uruchom Docker Desktop i poczekaj
```

### Problem: "Port already in use"
```bash
# Sprawdź co używa portów 8000/8001
lsof -ti:8000
lsof -ti:8001

# Zatrzymaj kontenery i uruchom ponownie
npm run docker:down
npm run docker:up
```

### Problem: "Image not found"
```bash
# Pobierz obrazy ręcznie
docker pull amazon/dynamodb-local:latest
docker pull aaronshaf/dynamodb-admin:latest

# Potem uruchom
npm run docker:up
```

## 7. 🎯 Test Kompletny

```bash
# 1. Uruchom wszystko
npm run start:with-db

# 2. Otwórz aplikację
open http://localhost:3000

# 3. Otwórz DynamoDB Admin
open http://localhost:8001

# 4. Sprawdź API
curl http://localhost:3001/api/debug/database
```

## 8. 🧹 Czyszczenie

```bash
# Zatrzymaj i usuń kontenery
npm run docker:down

# Usuń dane (UWAGA: usuwa wszystkie dane!)
rm -rf ./docker/

# Usuń obrazy Docker (opcjonalnie)
docker rmi amazon/dynamodb-local:latest
docker rmi aaronshaf/dynamodb-admin:latest
```

## 9. ✅ Sprawdź czy DynamoDB działa

Po uruchomieniu powinieneś zobaczyć:

### W terminalu:
```
✅ DynamoDB Local running on http://localhost:8000
✅ DynamoDB Admin UI running on http://localhost:8001
✅ Tables created successfully: Users, TableSettings
✅ Server running on http://localhost:3001
✅ Frontend running on http://localhost:3000
```

### W DynamoDB Admin (http://localhost:8001):
- Tabela `Users`
- Tabela `TableSettings`

### W aplikacji:
- Ustawienia InProgressTable zapisują się w DynamoDB
- Ustawienia innych tabel w localStorage
- Wszystko działa identycznie jak bez Dockera

## 🎉 Gotowe!

Teraz masz pełną konfigurację z DynamoDB Local w Dockerze!