# Инструкция по установке Print Server

## 1. Установка зависимостей

```bash
cd printserver
npm install
```

Это установит Puppeteer (~300MB с Chromium).

## 2. Установка PDFtoPrinter (только для Windows)

### Скачивание

1. Перейдите на сайт: http://www.columbia.edu/~em36/pdftoprinter.html
2. Скачайте **PDFtoPrinter.exe**
3. Поместите файл в директорию `printserver/`

### Альтернативный способ (через PowerShell)

```powershell
# В директории printserver выполните:
Invoke-WebRequest -Uri "http://www.columbia.edu/~em36/PDFtoPrinter.exe" -OutFile "PDFtoPrinter.exe"
```

### Проверка установки

```bash
PDFtoPrinter.exe /?
```

Должна появиться справка по использованию.

## 3. Создание директории для временных файлов

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Path "temp" -Force

# Linux/macOS
mkdir -p temp
```

## 4. Настройка конфигурации

Отредактируйте `config.js` и обязательно измените API ключ!

## 5. Запуск сервера

```bash
npm start
```

Сервер запустится на `http://0.0.0.0:3000`

## 6. Проверка работы

```bash
# Получить список принтеров
curl -X POST http://localhost:3000/getprinters \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here"

# Отправить на печать
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{
    "html": "<h1>Test Print</h1>",
    "printer": "Microsoft Print to PDF",
    "options": {
      "format": "A4",
      "orientation": "portrait",
      "copies": 1
    }
  }'
```

## Устранение неполадок

### PDFtoPrinter.exe не найден

Убедитесь, что файл находится в директории `printserver/` и имеет права на выполнение.

### Puppeteer не устанавливается

Попробуйте установить с флагом:
```bash
npm install puppeteer --ignore-scripts=false
```

### Порт занят

Измените порт в `config.js` на свободный.
