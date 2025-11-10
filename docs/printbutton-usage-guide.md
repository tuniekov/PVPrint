# Руководство по использованию компонента PVPrint

## Обзор

`PVPrint` - это динамически загружаемый Vue компонент для печати HTML документов через систему PVPrint. Компонент предоставляет удобный интерфейс с выбором принтера, настройкой параметров печати и сохранением настроек в localStorage.

## Возможности

- ✅ Кнопка печати с иконкой и названием выбранного принтера
- ✅ Выпадающее меню с выбором принтера
- ✅ Настройка параметров печати (формат, ориентация, копии)
- ✅ Сохранение настроек по умолчанию
- ✅ Сохранение настроек для конкретной страницы
- ✅ Автоматическая загрузка сохраненных настроек
- ✅ События для отслеживания процесса печати
- ✅ Интеграция с PVTables notify для уведомлений
- ✅ Фильтрация принтеров по группам и серверам

## Установка и сборка

### 1. Сборка компонента

```bash
npm run build -- --config vite.config.printbutton.js
```

После сборки файлы будут размещены в:
- `assets/components/pvprint/web/js/pvprint.js`
- `assets/components/pvprint/web/css/pvprint.css`

### 2. Регистрация компонента

Компонент автоматически загружается через систему динамической загрузки компонентов.

## Использование

### Базовое использование

```vue
<template>
  <div>
    <PVPrint 
      :html-content="documentHTML"
      page-key="invoice-page"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const documentHTML = ref(`
  <html>
    <head>
      <style>
        body { font-family: Arial; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <h1>Счет #12345</h1>
      <p>Сумма: 1000 руб.</p>
    </body>
  </html>
`)
</script>
```

### Использование с callback функцией

```vue
<template>
  <div>
    <PVPrint 
      :get-html-content="generateHTML"
      page-key="report-page"
      @print-success="handlePrintSuccess"
    />
  </div>
</template>

<script setup>
const generateHTML = async () => {
  // Генерация HTML динамически
  const data = await fetchReportData()
  
  return `
    <html>
      <body>
        <h1>Отчет</h1>
        <table>
          ${data.map(row => `<tr><td>${row.name}</td></tr>`).join('')}
        </table>
      </body>
    </html>
  `
}

const handlePrintSuccess = (result) => {
  console.log('Печать успешна:', result)
}
</script>
```

## Props

### htmlContent
- **Тип**: `String`
- **По умолчанию**: `''`
- **Описание**: HTML контент для печати. Если не указан, используется `getHtmlContent`.

### pageKey
- **Тип**: `String`
- **По умолчанию**: `''`
- **Описание**: Уникальный ключ страницы для сохранения настроек печати. Если указан, настройки можно сохранить отдельно для этой страницы.

### getHtmlContent
- **Тип**: `Function`
- **По умолчанию**: `null`
- **Описание**: Callback функция для динамической генерации HTML. Вызывается при печати, если `htmlContent` не указан.

**Пример:**
```javascript
const getHtmlContent = async () => {
  const data = await loadData()
  return generateHTMLFromData(data)
}
```

### customPrintHandler
- **Тип**: `Function`
- **По умолчанию**: `null`
- **Описание**: Кастомная функция для обработки печати. Если указана, компонент вызывает эту функцию вместо стандартной логики печати. Функция получает выбранный принтер и настройки печати.

**Параметры функции:**
- `printer` - объект выбранного принтера
- `options` - объект с настройками печати

**Пример:**
```javascript
const customPrintHandler = async (printer, options) => {
  console.log('Принтер:', printer.short_name)
  console.log('Настройки:', options)
  
  // Ваша кастомная логика печати
  const result = await myCustomPrintAPI(printer.id, options)
  
  return {
    job_id: result.id,
    message: 'Успешно отправлено!'
  }
}
```

### group_ids
- **Тип**: `Array`
- **По умолчанию**: `[]`
- **Описание**: Массив ID групп принтеров для фильтрации. Если указан, показываются только принтеры из этих групп.

**Пример:**
```vue
<PVPrint :group_ids="[1, 2, 3]" />
```

### server_ids
- **Тип**: `Array`
- **По умолчанию**: `[]`
- **Описание**: Массив ID серверов для фильтрации. Если указан, показываются только принтеры с этих серверов.

**Пример:**
```vue
<PVPrint :server_ids="[1]" />
```

## Events

### print-start
Вызывается при начале процесса печати.

```vue
<PVPrint @print-start="handlePrintStart" />
```

### print-success
Вызывается при успешной отправке на печать.

**Параметры:**
- `result` - объект с данными о задании печати

```vue
<PVPrint @print-success="handlePrintSuccess" />
```

```javascript
const handlePrintSuccess = (result) => {
  console.log('Job ID:', result.job_id)
  console.log('Status:', result.status)
  console.log('Printer:', result.printer)
}
```

### print-error
Вызывается при ошибке печати.

**Параметры:**
- `error` - объект ошибки

```vue
<PVPrint @print-error="handlePrintError" />
```

```javascript
const handlePrintError = (error) => {
  console.error('Ошибка печати:', error.message)
}
```

## Функциональность

### Выбор принтера

Компонент автоматически загружает список активных принтеров из базы данных при монтировании. Пользователь может:

1. Кликнуть по стрелке вниз для открытия меню
2. Выбрать принтер из списка
3. Выбранный принтер отображается на кнопке

### Параметры печати

Доступные параметры:

- **Формат**: A4, A3, Letter, Legal
- **Ориентация**: Книжная (portrait), Альбомная (landscape)
- **Копий**: 1-99

### Сохранение настроек

#### По умолчанию
Настройки сохраняются в `localStorage` с ключом `print_settings_default` и применяются ко всем страницам, где не указаны специфичные настройки.

#### Для конкретной страницы
Если указан `pageKey`, настройки сохраняются с ключом `print_settings_{pageKey}` и применяются только на этой странице.

**Приоритет загрузки:**
1. Настройки для конкретной страницы (если есть `pageKey`)
2. Настройки по умолчанию
3. Стандартные значения (A4, portrait, 1 копия)

## API через gtsAPI

Компонент использует gtsAPI для работы с данными:

### Загрузка принтеров

```javascript
const api_pvPrinter = apiCtor('pvPrinter')
const response = await api_pvPrinter.read()
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "id": 1,
        "short_name": "hplaser",
        "name": "HP LaserJet",
        "server_id": 1,
        "group_id": 1,
        "active": 1
      }
    ]
  }
}
```

### Отправка на печать

```javascript
const response = await api_pvPrinter.action('pvprint/print', {
  html: htmlContent,
  printer_id: printerId,
  options: {
    format: 'A4',
    orientation: 'portrait',
    copies: 1
  }
})
```

**Ответ:**
```json
{
  "success": true,
  "message": "Отправлено на печать",
  "data": {
    "job_id": "job_1234567890_abc",
    "status": "queued",
    "printer": "HP LaserJet"
  }
}
```

### Фильтрация принтеров

Компонент поддерживает фильтрацию принтеров на клиентской стороне:

```vue
<PVPrint 
  :group_ids="[1, 2]"
  :server_ids="[1]"
/>
```

Принтеры фильтруются после загрузки из API по указанным ID групп и серверов.

## Примеры использования

### Пример 1: Печать счета

```vue
<template>
  <div class="invoice-page">
    <div class="invoice-header">
      <h1>Счет #{{ invoiceId }}</h1>
      <PVPrint 
        :get-html-content="getInvoiceHTML"
        page-key="invoice"
        @print-success="onPrintSuccess"
      />
    </div>
    
    <div class="invoice-content">
      <!-- Содержимое счета -->
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const invoiceId = ref('12345')

const getInvoiceHTML = () => {
  // Получить HTML из DOM
  const content = document.querySelector('.invoice-content')
  
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20mm; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #ddd; padding: 8px; }
        </style>
      </head>
      <body>
        <h1>Счет #${invoiceId.value}</h1>
        ${content.innerHTML}
      </body>
    </html>
  `
}

const onPrintSuccess = (result) => {
  console.log('Счет отправлен на печать:', result.job_id)
}
</script>
```

### Пример 2: Печать отчета с данными

```vue
<template>
  <div>
    <PVPrint 
      :get-html-content="generateReport"
      page-key="sales-report"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const reportData = ref([
  { product: 'Товар 1', quantity: 10, price: 100 },
  { product: 'Товар 2', quantity: 5, price: 200 }
])

const generateReport = () => {
  const total = reportData.value.reduce((sum, item) => 
    sum + (item.quantity * item.price), 0
  )
  
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          .total { font-weight: bold; background: #e0e0e0; }
        </style>
      </head>
      <body>
        <h1>Отчет по продажам</h1>
        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Количество</th>
              <th>Цена</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.value.map(item => `
              <tr>
                <td>${item.product}</td>
                <td>${item.quantity}</td>
                <td>${item.price} руб.</td>
                <td>${item.quantity * item.price} руб.</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="3">Итого:</td>
              <td>${total} руб.</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `
}
</script>
```

### Пример 3: Печать с предпросмотром

```vue
<template>
  <div>
    <button @click="showPreview = true">Предпросмотр</button>
    
    <Dialog v-model:visible="showPreview" header="Предпросмотр печати">
      <div v-html="previewHTML"></div>
      
      <template #footer>
        <PVPrint 
          :html-content="previewHTML"
          @print-success="showPreview = false"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'

const showPreview = ref(false)

const previewHTML = computed(() => {
  return `
    <html>
      <body>
        <h1>Документ для печати</h1>
        <p>Содержимое...</p>
      </body>
    </html>
  `
})
</script>
```

## Стилизация

Компонент использует scoped стили, но вы можете переопределить их через CSS:

```css
/* Изменить цвет кнопки */
.print-button {
  background: #28a745 !important;
}

.print-button:hover {
  background: #218838 !important;
}

/* Изменить размер меню */
.print-menu {
  min-width: 350px !important;
}
```

## Требования

- Vue 3
- PVTables (для API и уведомлений)
- PrimeVue (для иконок)
- Настроенный PVPrint сервер
- Активные принтеры в базе данных

## Устранение неполадок

### Принтеры не загружаются

1. Проверьте работу gtsAPI таблицы `pvPrinter`
2. Убедитесь, что в базе есть активные принтеры
3. Проверьте консоль браузера на ошибки
4. Проверьте конфигурацию gtsapipackages для таблицы `pvPrinter`

### Печать не работает

1. Проверьте, что выбран принтер
2. Убедитесь, что HTML контент не пустой
3. Проверьте работу gtsAPI action `pvprint/print`
4. Проверьте логи принт-сервера
5. Убедитесь, что принт-сервер запущен и доступен

### Настройки не сохраняются

1. Проверьте, что localStorage доступен
2. Убедитесь, что указан `pageKey` для сохранения настроек страницы
3. Проверьте, что чекбоксы "Сохранить" отмечены

## Лучшие практики

1. **Используйте pageKey** для разных страниц, чтобы сохранять отдельные настройки
2. **Генерируйте HTML динамически** через `getHtmlContent` для актуальных данных
3. **Обрабатывайте события** для отслеживания статуса печати
4. **Добавляйте стили** в HTML для корректного отображения при печати
5. **Тестируйте** на разных принтерах и форматах бумаги

## Заключение

Компонент `PVPrint` предоставляет удобный и гибкий способ печати HTML документов с сохранением пользовательских настроек и интеграцией с системой PVPrint.
