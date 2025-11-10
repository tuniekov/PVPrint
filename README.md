# PVPrint

Система печати для MODX с поддержкой физических принтеров через print-server и виртуального PDF принтера.

## 📋 Содержание

- [Возможности](#возможности)
- [Установка](#установка)
- [Компонент PVPrint](#компонент-pvprint)
- [Печать на стороне PHP](#печать-на-стороне-php)
- [Модуль настроек](#модуль-настроек)
- [Print Server](#print-server)
- [Виртуальный PDF принтер](#виртуальный-pdf-принтер)

---

## 🎯 Возможности

✅ **Физическая печать** - отправка на реальные принтеры через print-server  
✅ **Виртуальный PDF** - генерация PDF в браузере без сервера  
✅ **Управление принтерами** - группировка, серверы, активация  
✅ **Сохранение настроек** - по умолчанию и для конкретных страниц  
✅ **Гибкая интеграция** - Vue компонент, PHP API, customPrintHandler  

---

## 📦 Установка

### 1. Установка пакета

```bash
npm install
npm run build:component
npm run upconfig
```

### 3. Загрузка данных

```bash
npm run upconfig
```

Это создаст:
- Группу "Виртуальные принтеры"
- Виртуальный PDF принтер

---

## 🖨️ Компонент PVPrint

### Подключение компонента

#### 1. Настройка component-loader.js

```javascript
// src/utils/component-loader.js
import * as Vue from 'vue'
import * as PVTables from 'pvtables/dist/pvtables'

// Делаем Vue и PVTables доступными глобально для UMD компонентов
window.Vue = Vue
window.PVTables = PVTables

class ComponentLoader {
  constructor() {
    this.loadedComponents = new Set()
    this.componentPromises = new Map()
  }

  async loadComponent(componentName) {
    // Если компонент уже загружен
    if (this.loadedComponents.has(componentName)) {
      return window[componentName]
    }

    // Если компонент уже загружается
    if (this.componentPromises.has(componentName)) {
      return this.componentPromises.get(componentName)
    }

    // Загружаем компонент
    const promise = this._loadComponentFiles(componentName)
    this.componentPromises.set(componentName, promise)

    try {
      const component = await promise
      this.loadedComponents.add(componentName)
      this.componentPromises.delete(componentName)
      return component
    } catch (error) {
      this.componentPromises.delete(componentName)
      throw error
    }
  }

  async _loadComponentFiles(componentName) {
    const basePath = '/assets/components/pvprint/web'
    
    // Загружаем CSS
    await this._loadCSS(`${basePath}/css/pvprint.css`)
    
    // Загружаем JS
    await this._loadScript(`${basePath}/js/pvprint.js`)
    
    // Возвращаем компонент из window
    if (!window[componentName]) {
      throw new Error(`Компонент ${componentName} не найден после загрузки`)
    }
    
    return window[componentName]
  }

  _loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = resolve
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = resolve
      script.onerror = reject
      document.body.appendChild(script)
    })
  }
}

export const componentLoader = new ComponentLoader()
```

#### 2. Использование в Vue компоненте

```vue
<template>
  <div>
    <PVPrint 
      v-if="isPVPrintLoaded"
      :get-html-content="generatePrintHTML"
      page-key="naryad-module"
      @print-success="handlePrintSuccess"
      @print-error="handlePrintError"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { componentLoader } from '@/utils/component-loader'

const isPVPrintLoaded = ref(false)

onMounted(async () => {
  
  // Загружаем компонент PVPrint динамически
  try {
    await componentLoader.loadComponent('PVPrint')
    isPVPrintLoaded.value = true
    console.log('✓ Компонент PVPrint загружен')
  } catch (error) {
    console.error('Ошибка загрузки компонента PVPrint:', error)
  }
})

// Функция генерации HTML для печати
const generatePrintHTML = () => {
  return `
    <div style="padding: 20px;">
      <h1>Наряд №123</h1>
      <p>Дата: ${new Date().toLocaleDateString()}</p>
      <table>
        <tr><td>Позиция</td><td>Количество</td></tr>
        <tr><td>Товар 1</td><td>10</td></tr>
      </table>
    </div>
  `
}

const handlePrintSuccess = (result) => {
  console.log('Печать успешна:', result)
}

const handlePrintError = (error) => {
  console.error('Ошибка печати:', error)
}
</script>
```

### Props компонента

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `htmlContent` | String | `''` | HTML контент для печати |
| `pageKey` | String | `''` | Ключ страницы для сохранения настроек |
| `getHtmlContent` | Function | `null` | Callback для получения HTML |
| `customPrintHandler` | Function | `null` | Кастомная функция печати |
| `group_ids` | Array | `[]` | Фильтр по ID групп принтеров. Показывает только принтеры из указанных групп |
| `server_ids` | Array | `[]` | Фильтр по ID серверов. Показывает только принтеры с указанных серверов |

### Events

| Event | Параметры | Описание |
|-------|-----------|----------|
| `print-start` | - | Начало печати |
| `print-success` | `result` | Успешная печать |
| `print-error` | `error` | Ошибка печати |

### Способы передачи HTML

#### 1. Через props.htmlContent

```vue
<PVPrint 
  :html-content="myHTML"
  page-key="invoice"
/>
```

#### 2. Через getHtmlContent

```vue
<PVPrint 
  :get-html-content="generateHTML"
  page-key="invoice"
/>

<script setup>
const generateHTML = () => {
  return document.getElementById('invoice').innerHTML
}
</script>
```

#### 3. Через customPrintHandler

```vue
<PVPrint 
  ref="printBtn"
  :custom-print-handler="handlePrint"
  page-key="invoice"
/>

<script setup>
import { ref } from 'vue'

const printBtn = ref(null)

const handlePrint = async (printer, options) => {
  const html = getMyHTML()
  
  // Для PDF принтера
  if (printer.is_virtual === 1) {
    return await printBtn.value.generatePDF(html, {
      pageKey: 'custom-invoice',
      printOptions: options
    })
  }
  
  // Для физических принтеров
  // Ваша логика...
}
</script>
```

### Фильтрация принтеров

#### По группам принтеров

```vue
<PVPrint 
  :group_ids="[1, 2]"
  page-key="warehouse"
/>
```

Будут показаны только принтеры из групп с ID 1 и 2.

#### По серверам

```vue
<PVPrint 
  :server_ids="[3]"
  page-key="office"
/>
```

Будут показаны только принтеры с сервера с ID 3.

#### Комбинированная фильтрация

```vue
<PVPrint 
  :group_ids="[1]"
  :server_ids="[2, 3]"
  page-key="production"
/>
```

Будут показаны только принтеры из группы 1 И с серверов 2 или 3.

---

## 🔧 Печать на стороне PHP

### Инициализация сервиса

```php
<?php
// Получить сервис PVPrint
$PVPrint = $modx->getService('PVPrint', 'PVPrint', 
    MODX_CORE_PATH . 'components/pvprint/model/'
);

if (!$PVPrint) {
    return 'Ошибка загрузки PVPrint';
}
```

### Печать HTML

```php
<?php
// HTML контент для печати
$html = '
<div style="padding: 20px;">
    <h1>Накладная №' . $invoiceId . '</h1>
    <p>Дата: ' . date('d.m.Y') . '</p>
    <table border="1">
        <tr><td>Товар</td><td>Количество</td></tr>
        <tr><td>Товар 1</td><td>10</td></tr>
    </table>
</div>
';

// ID принтера
$printerId = 2;

// Опции печати
$options = [
    'format' => 'A4',
    'orientation' => 'portrait',
    'copies' => 1
];

// Отправить на печать
$result = $PVPrint->printHTML($html, $printerId, $options);

if ($result['success']) {
    echo 'Отправлено на печать: ' . $result['data']['job_id'];
} else {
    echo 'Ошибка: ' . $result['message'];
}
```

---

## ⚙️ Модуль настроек

### Открытие модуля на странице

```modx
{'!mixVue' | snippet : [
    'app'=>'pvprint',
    'config'=>[
        'module'=>'PrintSetting'
    ]
]}
```

### Синхронизация принтеров

В модуле `PrintSetting` на вкладке серверы у сервера есть кнопка синхронизировать принтеры. При нажатии, на сервере печати определаются доступные принтеры и они заносятся в базу компонента. Во вкладке принтеры их можно отредактировать.

---

## 🖥️ Print Server

### Установка Node.js

1. Скачать Node.js: https://nodejs.org/ (LTS версия)
2. Установить Node.js
3. Проверить установку:

```bash
node --version
npm --version
```

### Настройка Print Server

#### 1. Установка зависимостей

```bash
cd printserver
npm install
```

#### 2. Конфигурация (printserver/config.js)

```javascript
module.exports = {
  // Порт сервера
  port: 3200,
  
  // API ключ для авторизации
  apiKey: 'your-secret-api-key-here',
  
  // Путь для временных PDF файлов
  tempDir: './temp',
  
  // Путь к PDFtoPrinter.exe (для Windows)
  pdfToPrinterPath: './PDFtoPrinter.exe',
  
  // Логирование
  logging: {
    enabled: true,
    level: 'info' // 'error', 'warn', 'info', 'debug'
  },
  
  // CORS настройки
  cors: {
    origin: '*', // В продакшене указать конкретный домен
    credentials: true
  }
}
```

#### 3. Запуск в режиме разработки

```bash
cd printserver
node printserver.js
```

Сервер запустится на `http://localhost:3001`

### Использование PM2 (продакшен)

#### 1. Установка PM2

```bash
npm install -g pm2
```

#### 2. Запуск через PM2

```bash
cd printserver
pm2 start printserver.js --name "print-server"
```

#### 3. Автозапуск при старте системы

```bash
# Сохранить текущий список процессов
pm2 save

# Настроить автозапуск
pm2 startup
# Выполнить команду, которую выдаст PM2
```

#### 4. Полезные команды PM2

```bash
# Просмотр логов
pm2 logs print-server

# Перезапуск
pm2 restart print-server

# Остановка
pm2 stop print-server

# Удаление из PM2
pm2 delete print-server

# Список процессов
pm2 list

# Мониторинг
pm2 monit
```

---

## 📄 Виртуальный PDF принтер

### Особенности

✅ Работает без print-server  
✅ Генерация PDF в браузере  
✅ Открывается в новой вкладке  
✅ Автоматическое имя файла с pageKey  
✅ Поддержка всех параметров печати  

### Использование

Виртуальный PDF принтер автоматически доступен в списке принтеров после выполнения `npm run upconfig`.

При выборе PDF принтера:
1. HTML конвертируется в PDF через html2pdf.js
2. PDF открывается в новой вкладке браузера
3. Пользователь может просмотреть и сохранить файл

### Программное использование

```javascript
// Через ref компонента
const printBtn = ref(null)

const generatePDF = async () => {
  const html = '<div><h1>Документ</h1></div>'
  
  const result = await printBtn.value.generatePDF(html, {
    pageKey: 'my-document',
    printOptions: {
      format: 'A4',
      orientation: 'portrait'
    }
  })
  
  console.log(result.filename) // my-document_2025-01-10.pdf
}
```

---

## 📚 Дополнительная документация

- [Модульная система](docs/modular-system-guide.md)
- [PVTabs](docs/pvtabs-usage-guide.md)
- [gtsAPI пакеты](docs/use_gtsapipackages.md)
- [PrintButton компонент](docs/printbutton-usage-guide.md)

---

## 🔐 Безопасность

1. **API ключи** - используйте сложные ключи для print-server
2. **CORS** - ограничьте домены в продакшене
3. **HTTPS** - используйте HTTPS для print-server в продакшене
4. **Валидация** - всегда валидируйте входные данные

---

## 🐛 Отладка

### Проверка print-server

```bash
curl http://localhost:3001/health
```

### Проверка принтеров

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3001/printers
```

### Логи PM2

```bash
pm2 logs print-server --lines 100
```

---

## 📝 Лицензия

MIT
