# Модули PVPrint

## Обзор

Эта директория содержит Vue.js модули для приложения PVPrint. Модульная система позволяет легко добавлять новые функциональные блоки без изменения основного кода приложения.

## Доступные модули

### PrintSetting

Модуль для управления настройками печати, включающий:

- **Принт-сервера** - управление серверами печати
- **Группы принтеров** - организация принтеров по группам
- **Принтеры** - управление принтерами с фильтрацией по активности

**Использование:**
```javascript
// В MODX через сниппет mixVue
{'!mixVue' | snippet : [
    'app'=>'pvprint',
    'config'=>[
        'module'=>'PrintSetting'
    ]
]}
```

## Добавление нового модуля

### Шаг 1: Создание файла модуля

Создайте новый `.vue` файл в этой директории:

```vue
<template>
  <div class="my-module">
    <h1>Мой модуль</h1>
    <!-- Ваш контент -->
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Логика модуля
</script>

<style scoped>
.my-module {
  padding: 1rem;
}
</style>
```

### Шаг 2: Обновление индекса

Выполните команду для автоматического обновления индекса модулей:

```bash
npm run modules:update
```

Эта команда автоматически:
- Сканирует директорию `src/modules/`
- Находит все `.vue` файлы
- Генерирует импорты в `index.js`
- Обновляет список доступных модулей

### Шаг 3: Использование модуля

После обновления индекса модуль автоматически становится доступным:

1. В селекторе модулей приложения
2. Через конфигурацию `pvprintConfigs.module`
3. В MODX через сниппет mixVue

## Структура модуля с PVTabs

Пример модуля с вкладками:

```vue
<template>
  <div class="module-container">
    <PVTabs 
      ref="tabsRef"
      :tabs="tabs"
      :actions="actions"
      :filters="filters"
      :current_id="currentId"
      @refresh-table="handleRefresh"
    />
  </div>
</template>

<script setup>
import { PVTabs } from 'pvtables/dist/pvtables'
import { ref } from 'vue'

const tabs = ref({
  tab1: {
    title: 'Первая вкладка',
    type: 'table',
    table: 'tableName',
    active: true
  },
  tab2: {
    title: 'Вторая вкладка',
    type: 'form',
    table: 'tableName'
  }
})

const actions = ref()
const filters = ref({})
const currentId = ref(0)

const handleRefresh = () => {
  console.log('Обновление')
}
</script>
```

## Конфигурация gtsAPIPackages

Для работы модулей с таблицами необходимо создать конфигурацию в `_build/configs/gtsapipackages.js`:

```javascript
export default {
    pvprint: {
        name: 'pvprint',
        gtsAPITables: {
            tableName: {
                table: 'tableName',
                class: 'ClassName',
                autocomplete_field: 'name',
                version: 1,
                type: 1,
                authenticated: true,
                groups: 'Administrator',
                active: true,
                properties: {
                    actions: {
                        read: {},
                        create: { groups: 'Administrator' },
                        update: { groups: 'Administrator' },
                        delete: { groups: 'Administrator' }
                    },
                    fields: {
                        // Конфигурация полей
                    }
                }
            }
        }
    }
}
```

## Автоматическая генерация

Файл `generate-index.js` автоматически:
- Сканирует все `.vue` файлы в директории
- Создает импорты для каждого модуля
- Экспортирует объект `modules` со всеми модулями
- Создает массив `modulesList` для селектора

**Не редактируйте `index.js` вручную!** Используйте команду `npm run modules:update`.

## Рекомендации

1. **Именование**: Используйте PascalCase для имен файлов модулей
2. **Структура**: Следуйте единой структуре для всех модулей
3. **Стили**: Используйте scoped стили для изоляции CSS
4. **Документация**: Добавляйте комментарии к сложной логике
5. **Обновление**: Всегда запускайте `npm run modules:update` после создания нового модуля

## Интеграция с MODX

Модули вызываются через сниппет mixVue:

```modx
{'!mixVue' | snippet : [
    'app'=>'pvprint',
    'config'=>[
        'module'=>'PrintSetting'
    ]
]}
```

Где:
- `app` - название пакета (pvprint)
- `config.module` - название модуля (PrintSetting)

## Отладка

Для отладки модулей:

1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что модуль зарегистрирован в `index.js`
3. Проверьте правильность импортов
4. Убедитесь, что таблицы настроены в gtsAPIPackages

## Дополнительная информация

Подробная документация:
- [Модульная система](../../docs/modular-system-guide.md)
- [PVTabs](../../docs/pvtabs-usage-guide.md)
- [gtsAPIPackages](../../docs/use_gtsapipackages.md)
