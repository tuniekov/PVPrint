<template>
  <div class="print-setting-module">
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
import { ref, onMounted } from 'vue'

const tabsRef = ref()
const currentId = ref(0)

// Конфигурация вкладок
const tabs = ref({
  servers: {
    title: 'Принт-сервера',
    type: 'table',
    table: 'pvPrintServer',
    active: true
  },
  groups: {
    title: 'Группы принтеров',
    type: 'table',
    table: 'pvPrinterGroup'
  },
  printers: {
    title: 'Принтеры',
    type: 'table',
    table: 'pvPrinter'
  }
})

// Действия для таблиц
const actions = ref()

// Фильтры для вкладок
const filters = ref({
  servers: {},
  groups: {},
  printers: {
    active: 1 // По умолчанию показываем только активные принтеры
  }
})

// Обработчик обновления таблицы
const handleRefresh = () => {
  console.log('Обновление таблицы PrintSetting')
}

// Инициализация при монтировании
onMounted(() => {
  console.log('Модуль PrintSetting загружен')
})
</script>

<style scoped>
.print-setting-module {
  padding: 1rem;
  width: 100%;
}
</style>
