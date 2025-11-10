# Print Server API

Node.js веб-сервер для получения списка принтеров и печати HTML документов на принтерах Windows или Linux.

## Возможности

- ✅ Автоматическое определение операционной системы (Windows/Linux/macOS)
- ✅ Получение списка принтеров через PowerShell (Windows) или CUPS (Linux/macOS)
- ✅ **Печать HTML документов** через Puppeteer → PDF → Принтер
- ✅ **Асинхронная очередь печати** с отслеживанием статуса
- ✅ Настройка параметров страницы (формат, ориентация, поля, копии)
- ✅ Аутентификация через API ключ
- ✅ CORS поддержка
- ✅ Подробное логирование
- ✅ Автоочистка старых заданий
- ✅ Graceful shutdown

## Требования

### Общие
- Node.js >= 14.0.0

### Windows
- PowerShell (встроен в Windows)
- Права на выполнение PowerShell команд

### Linux/macOS
- CUPS (Common Unix Printing System)
- Утилита `lpstat`

## Установка

1. Перейдите в директорию printserver:
```bash
cd printserver
```

2. Установите зависимости (если потребуется):
```bash
npm install
```

## Конфигурация

Отредактируйте файл `config.js`:

```javascript
export default {
    // API ключ для аутентификации запросов
    apiKey: 'your-secret-api-key-here',  // ОБЯЗАТЕЛЬНО измените!
    
    // Порт сервера
    port: 3000,
    
    // Хост (0.0.0.0 для доступа извне)
    host: '0.0.0.0',
    
    // Логирование
    logging: {
        enabled: true,
        level: 'info' // 'debug', 'info', 'warn', 'error'
    }
}
```

**ВАЖНО:** Обязательно измените `apiKey` на свой уникальный ключ!

## Запуск

### Обычный режим
```bash
npm start
```

### Режим разработки (с автоперезагрузкой)
```bash
npm run dev
```

Сервер запустится на `http://0.0.0.0:3000`

## API Endpoints

### GET /

Информация о сервере

**Пример запроса:**
```bash
curl http://localhost:3000/
```

**Ответ:**
```json
{
  "name": "Print Server API",
  "version": "1.0.0",
  "os": "windows",
  "endpoints": {
    "/getprinters": {
      "method": "POST",
      "description": "Получить список принтеров",
      "auth": "API Key (header: X-API-Key или body: api_key)"
    }
  }
}
```

### POST /getprinters

Получить список принтеров системы

**Аутентификация:**
- Через заголовок: `X-API-Key: your-api-key`
- Через тело запроса: `{ "api_key": "your-api-key" }`

**Пример запроса (через заголовок):**
```bash
curl -X POST http://localhost:3000/getprinters \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here"
```

**Пример запроса (через тело):**
```bash
curl -X POST http://localhost:3000/getprinters \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-secret-api-key-here"}'
```

**Успешный ответ (Windows):**
```json
{
  "success": true,
  "os": "windows",
  "count": 2,
  "printers": [
    {
      "name": "Microsoft Print to PDF",
      "driver": "Microsoft Print To PDF",
      "port": "PORTPROMPT:",
      "shared": false,
      "published": false,
      "status": "Normal",
      "type": "local"
    },
    {
      "name": "HP LaserJet",
      "driver": "HP Universal Printing PCL 6",
      "port": "IP_192.168.1.100",
      "shared": true,
      "published": false,
      "status": "Normal",
      "type": "local"
    }
  ]
}
```

**Успешный ответ (Linux):**
```json
{
  "success": true,
  "os": "linux",
  "count": 1,
  "printers": [
    {
      "name": "HP_LaserJet",
      "driver": "",
      "port": "ipp://192.168.1.100/ipp/print",
      "shared": false,
      "published": false,
      "status": "Idle",
      "type": "local"
    }
  ]
}
```

**Ошибка аутентификации:**
```json
{
  "success": false,
  "error": "API ключ не предоставлен"
}
```

```json
{
  "success": false,
  "error": "Неверный API ключ"
}
```

**Ошибка сервера:**
```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

## Структура ответа принтера

| Поле | Тип | Описание |
|------|-----|----------|
| name | string | Название принтера |
| driver | string | Драйвер принтера (Windows) |
| port | string | Порт/устройство принтера |
| shared | boolean | Принтер в общем доступе |
| published | boolean | Принтер опубликован в AD (Windows) |
| status | string | Статус принтера (Normal, Idle, Processing, Disabled, Unknown) |
| type | string | Тип принтера (local) |

## Логирование

Сервер ведет подробные логи:

```
[2024-01-10T12:00:00.000Z] [INFO] Print Server запущен на http://0.0.0.0:3000
[2024-01-10T12:00:00.001Z] [INFO] Операционная система: windows
[2024-01-10T12:00:05.123Z] [INFO] Запрос на получение принтеров
[2024-01-10T12:00:05.456Z] [INFO] Найдено принтеров Windows: 2
```

Уровни логирования:
- `debug` - детальная отладочная информация
- `info` - общая информация о работе
- `warn` - предупреждения
- `error` - ошибки

## Интеграция с PVPrint

В конфигурации принт-сервера в PVPrint укажите:

- **URL**: `http://your-server:3000`
- **API Key**: ваш API ключ из `config.js`

Пример использования в PHP:
```php
$url = 'http://localhost:3000/getprinters';
$apiKey = 'your-secret-api-key-here';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if ($data['success']) {
    $printers = $data['printers'];
    // Обработка списка принтеров
}
```

## Безопасность

1. **Измените API ключ** в `config.js` на уникальный
2. Используйте HTTPS в production (через reverse proxy)
3. Ограничьте доступ к серверу через firewall
4. Регулярно обновляйте Node.js

## Запуск как службы

### Windows (NSSM)

1. Скачайте NSSM: https://nssm.cc/download
2. Установите службу:
```cmd
nssm install PrintServer "C:\Program Files\nodejs\node.exe" "C:\path\to\printserver\printserver.js"
nssm set PrintServer AppDirectory "C:\path\to\printserver"
nssm start PrintServer
```

### Linux (systemd)

Создайте файл `/etc/systemd/system/printserver.service`:

```ini
[Unit]
Description=Print Server API
After=network.target

[Service]
Type=simple
User=printserver
WorkingDirectory=/path/to/printserver
ExecStart=/usr/bin/node printserver.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запустите службу:
```bash
sudo systemctl daemon-reload
sudo systemctl enable printserver
sudo systemctl start printserver
```

### POST /print

Отправить HTML документ на печать (асинхронно)

**Аутентификация:**
- Через заголовок: `X-API-Key: your-api-key`
- Через тело запроса: `{ "api_key": "your-api-key" }`

**Параметры запроса:**
```json
{
  "api_key": "your-secret-api-key-here",
  "html": "<html><body><h1>Hello World</h1></body></html>",
  "printer": "HP LaserJet",
  "options": {
    "format": "A4",
    "orientation": "portrait",
    "margin": {
      "top": "10mm",
      "right": "10mm",
      "bottom": "10mm",
      "left": "10mm"
    },
    "copies": 1
  }
}
```

**Обязательные параметры:**
- `html` - HTML код для печати
- `printer` - Имя принтера (из списка /getprinters)

**Опциональные параметры (options):**
- `format` - Формат страницы: A4, A3, Letter, Legal, Tabloid (по умолчанию: A4)
- `orientation` - Ориентация: portrait, landscape (по умолчанию: portrait)
- `margin` - Поля страницы в мм (по умолчанию: 10mm со всех сторон)
- `copies` - Количество копий: 1-999 (по умолчанию: 1)

**Пример запроса:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{
    "html": "<html><body><h1>Test Print</h1><p>This is a test document.</p></body></html>",
    "printer": "Microsoft Print to PDF",
    "options": {
      "format": "A4",
      "orientation": "portrait",
      "margin": {
        "top": "15mm",
        "right": "15mm",
        "bottom": "15mm",
        "left": "15mm"
      },
      "copies": 2
    }
  }'
```

**Успешный ответ:**
```json
{
  "success": true,
  "job_id": "job_1704902400000_abc123xyz",
  "status": "queued",
  "message": "Задание добавлено в очередь"
}
```

**Ошибки валидации:**
```json
{
  "success": false,
  "error": "Ошибки валидации",
  "errors": [
    "Неверный формат: A5. Допустимые: A4, A3, Letter, Legal, Tabloid"
  ]
}
```

### GET /print/status/:job_id

Получить статус задания печати

**Пример запроса:**
```bash
curl http://localhost:3000/print/status/job_1704902400000_abc123xyz
```

**Ответ (задание в очереди):**
```json
{
  "success": true,
  "job": {
    "id": "job_1704902400000_abc123xyz",
    "status": "queued",
    "printer": "HP LaserJet",
    "created_at": "2024-01-10T12:00:00.000Z",
    "completed_at": null,
    "error": null
  }
}
```

**Ответ (задание выполняется):**
```json
{
  "success": true,
  "job": {
    "id": "job_1704902400000_abc123xyz",
    "status": "processing",
    "printer": "HP LaserJet",
    "created_at": "2024-01-10T12:00:00.000Z",
    "completed_at": null,
    "error": null
  }
}
```

**Ответ (задание выполнено):**
```json
{
  "success": true,
  "job": {
    "id": "job_1704902400000_abc123xyz",
    "status": "completed",
    "printer": "HP LaserJet",
    "created_at": "2024-01-10T12:00:00.000Z",
    "completed_at": "2024-01-10T12:00:05.000Z",
    "error": null
  }
}
```

**Ответ (ошибка выполнения):**
```json
{
  "success": true,
  "job": {
    "id": "job_1704902400000_abc123xyz",
    "status": "failed",
    "printer": "HP LaserJet",
    "created_at": "2024-01-10T12:00:00.000Z",
    "completed_at": "2024-01-10T12:00:05.000Z",
    "error": "PDFtoPrinter.exe не найден: ./PDFtoPrinter.exe"
  }
}
```

**Статусы заданий:**
- `queued` - в очереди
- `processing` - выполняется
- `completed` - выполнено успешно
- `failed` - ошибка выполнения

### GET /print/queue

Получить текущую очередь печати

**Пример запроса:**
```bash
curl http://localhost:3000/print/queue
```

**Ответ:**
```json
{
  "success": true,
  "queue": [
    {
      "id": "job_1704902400000_abc123",
      "status": "processing",
      "printer": "HP LaserJet",
      "created_at": "2024-01-10T12:00:00.000Z"
    },
    {
      "id": "job_1704902401000_def456",
      "status": "queued",
      "printer": "Canon Printer",
      "created_at": "2024-01-10T12:00:01.000Z"
    }
  ],
  "total": 2
}
```

## Процесс печати HTML

1. **Клиент отправляет POST /print** с HTML кодом и параметрами
2. **Сервер валидирует** запрос и параметры
3. **Задание добавляется в очередь** и возвращается job_id
4. **Асинхронная обработка:**
   - Генерация PDF из HTML через Puppeteer
   - Сохранение PDF во временный файл
   - Отправка на печать через PDFtoPrinter (Windows) или lp (Linux)
   - Удаление временного файла
5. **Клиент может проверить статус** через GET /print/status/:job_id

## Пример использования в PHP

```php
// Отправка на печать
$url = 'http://localhost:3000/print';
$apiKey = 'your-secret-api-key-here';

$data = [
    'html' => '<html><body><h1>Invoice #12345</h1><p>Total: $100</p></body></html>',
    'printer' => 'HP LaserJet',
    'options' => [
        'format' => 'A4',
        'orientation' => 'portrait',
        'copies' => 2
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: ' . $apiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($result['success']) {
    $jobId = $result['job_id'];
    
    // Проверка статуса
    sleep(2);
    $statusUrl = "http://localhost:3000/print/status/$jobId";
    $ch = curl_init($statusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $statusResponse = curl_exec($ch);
    curl_close($ch);
    
    $status = json_decode($statusResponse, true);
    echo "Статус: " . $status['job']['status'];
}
```

## Автоочистка заданий

Задания старше 1 часа автоматически удаляются из очереди каждые 5 минут. Настройки в `config.js`:

```javascript
jobCleanupAge: 3600000,      // 1 час
jobCleanupInterval: 300000   // 5 минут
```

## Устранение неполадок

### Windows: PowerShell не выполняется

Проверьте политику выполнения:
```powershell
Get-ExecutionPolicy
```

Если `Restricted`, измените на `RemoteSigned`:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Linux: lpstat не найден

Установите CUPS:
```bash
# Ubuntu/Debian
sudo apt-get install cups

# CentOS/RHEL
sudo yum install cups

# Arch Linux
sudo pacman -S cups
```

### Порт занят

Измените порт в `config.js` или освободите порт 3000:
```bash
# Linux
sudo lsof -i :3000
sudo kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Лицензия

MIT

## Поддержка

При возникновении проблем проверьте:
1. Логи сервера
2. Права доступа к PowerShell/CUPS
3. Корректность API ключа
4. Доступность порта
