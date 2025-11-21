<template>
  <div class="print-button-wrapper">
    <button 
      class="print-button"
      @click="handlePrint"
      :disabled="!selectedPrinter || printing"
    >
      <i class="pi pi-print"></i>
      <span class="printer-name">{{ printerLabel }}</span>
      <i class="pi pi-chevron-down dropdown-icon" @click.stop="toggleMenu"></i>
    </button>
    
    <div v-if="showMenu" class="print-menu" v-click-outside="closeMenu">
      <div class="menu-section">
        <h4>Выбор принтера</h4>
        <div class="printer-list">
          <div 
            v-for="printer in filteredPrinters" 
            :key="printer.id"
            class="printer-item"
            :class="{ active: selectedPrinter?.id === printer.id }"
            @click="selectPrinter(printer)"
          >
            <i class="pi pi-print"></i>
            <div class="printer-info">
              <span class="printer-short-name">{{ printer.short_name }}</span>
              <span class="printer-full-name">{{ printer.name }}</span>
            </div>
            <i v-if="selectedPrinter?.id === printer.id" class="pi pi-check"></i>
          </div>
          <div v-if="filteredPrinters.length === 0" class="no-printers">
            Нет доступных принтеров
          </div>
        </div>
      </div>
      
      <div class="menu-section">
        <h4>Параметры печати</h4>
        
        <div class="param-group">
          <label>Формат:</label>
          <select v-model="printOptions.format">
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>
        
        <div class="param-group">
          <label>Ориентация:</label>
          <select v-model="printOptions.orientation">
            <option value="portrait">Книжная</option>
            <option value="landscape">Альбомная</option>
          </select>
        </div>
        
        <div class="param-group">
          <label>Копий:</label>
          <input 
            type="number" 
            v-model.number="printOptions.copies" 
            min="1" 
            max="99"
          >
        </div>
        
        <div class="param-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              v-model="saveAsDefault"
            >
            Сохранить как по умолчанию
          </label>
        </div>
        
        <div class="param-group checkbox-group" v-if="pageKey">
          <label>
            <input 
              type="checkbox" 
              v-model="saveForPage"
            >
            Сохранить для этой страницы
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import html2pdf from 'html2pdf.js'

// Получаем зависимости из глобального объекта, предоставленного ComponentLoader
const { useNotifications, apiCtor } = window.PVTablesAPI || {}

if (!useNotifications || !apiCtor) {
  console.error('PVTablesAPI не найден. Убедитесь, что библиотека PVTables загружена.')
}

const props = defineProps({
  // HTML контент для печати (можно передать извне)
  htmlContent: {
    type: String,
    default: ''
  },
  // Ключ страницы для сохранения настроек
  pageKey: {
    type: String,
    default: ''
  },
  // Callback для получения HTML если не передан напрямую
  getHtmlContent: {
    type: Function,
    default: null
  },
  // Кастомная функция для печати (получает printer и options)
  customPrintHandler: {
    type: Function,
    default: null
  },
  // Фильтр по ID групп принтеров
  group_ids: {
    type: Array,
    default: () => []
  },
  // Фильтр по ID серверов
  server_ids: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['print-start', 'print-success', 'print-error'])

const { notify } = useNotifications()

// Экспортируем функцию generatePDF для использования в customPrintHandler
const generatePDF = async (html, options = {}) => {
  try {
    // Генерация имени файла с pageKey
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = options.pageKey || props.pageKey
      ? `${options.pageKey || props.pageKey}_${timestamp}.pdf`
      : `document_${timestamp}.pdf`
    
    // Настройки для html2pdf
    const pdfOptions = options.printOptions || printOptions.value
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        unit: 'mm', 
        format: pdfOptions.format.toLowerCase(),
        orientation: pdfOptions.orientation 
      }
    }
    
    // Генерация PDF и получение blob
    const pdfBlob = await html2pdf()
      .set(opt)
      .from(html)
      .output('blob')
    
    // Открыть в новой вкладке
    const url = URL.createObjectURL(pdfBlob)
    window.open(url, '_blank')
    
    // Очистка URL через 1 минуту
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    
    return {
      success: true,
      filename: filename,
      message: 'PDF создан и открыт в новой вкладке'
    }
  } catch (error) {
    console.error('Ошибка генерации PDF:', error)
    throw new Error('Не удалось создать PDF: ' + error.message)
  }
}

// Экспортируем для использования извне
defineExpose({
  generatePDF
})

// API клиент для принтеров
const api_pvPrinter = apiCtor('pvPrinter')

// Состояние
const showMenu = ref(false)
const printers = ref([])
const selectedPrinter = ref(null)
const printing = ref(false)
const saveAsDefault = ref(false)
const saveForPage = ref(false)

// Параметры печати
const printOptions = ref({
  format: 'A4',
  orientation: 'portrait',
  copies: 1
})

// Вычисляемые свойства
const printerLabel = computed(() => {
  if (printing.value) return 'Печать...'
  if (!selectedPrinter.value) return 'Выберите принтер'
  return selectedPrinter.value.short_name
})

// Проверка на виртуальный принтер
const isVirtualPrinter = computed(() => {
  return selectedPrinter.value?.is_virtual === 1 || 
         selectedPrinter.value?.short_name === 'pdf'
})

// Фильтрованный список принтеров
const filteredPrinters = computed(() => {
  let filtered = printers.value
  
  // Фильтр по группам
  if (props.group_ids && props.group_ids.length > 0) {
    filtered = filtered.filter(printer => 
      props.group_ids.includes(Number(printer.group_id))
    )
  }
  
  // Фильтр по серверам
  if (props.server_ids && props.server_ids.length > 0) {
    filtered = filtered.filter(printer => 
      props.server_ids.includes(Number(printer.server_id))
    )
  }
  
  return filtered
})

// Методы
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const loadPrinters = async () => {
  try {
    const response = await api_pvPrinter.read({
      filters: {
        active: {
          value: 1,
          matchMode: 'equals'
        }
      }
    })
    
    if (response.success) {
      printers.value = response.data.rows || []
      
      // Загрузить сохраненные настройки
      loadSavedSettings()
    } else {
      notify('error', { 
        detail: response.message || 'Не удалось загрузить список принтеров'
      })
    }
  } catch (error) {
    console.error('Ошибка загрузки принтеров:', error)
    notify('error', { 
      detail: error.message || 'Не удалось загрузить список принтеров'
    })
  }
}

const loadSavedSettings = () => {
  // Попытка загрузить настройки для конкретной страницы
  if (props.pageKey) {
    const pageSettings = localStorage.getItem(`print_settings_${props.pageKey}`)
    if (pageSettings) {
      const settings = JSON.parse(pageSettings)
      applySettings(settings)
      return
    }
  }
  
  // Загрузить настройки по умолчанию
  const defaultSettings = localStorage.getItem('print_settings_default')
  if (defaultSettings) {
    const settings = JSON.parse(defaultSettings)
    applySettings(settings)
  }
}

const applySettings = (settings) => {
  if (settings.printerId) {
    const printer = printers.value.find(p => p.id === settings.printerId)
    if (printer) {
      selectedPrinter.value = printer
    }
  }
  
  if (settings.options) {
    printOptions.value = { ...printOptions.value, ...settings.options }
  }
}

const selectPrinter = (printer) => {
  selectedPrinter.value = printer
}

const saveSettings = () => {
  const settings = {
    printerId: selectedPrinter.value?.id,
    options: { ...printOptions.value }
  }
  
  if (saveAsDefault.value) {
    localStorage.setItem('print_settings_default', JSON.stringify(settings))
  }
  
  if (saveForPage.value && props.pageKey) {
    localStorage.setItem(`print_settings_${props.pageKey}`, JSON.stringify(settings))
  }
}

const handlePrint = async () => {
  if (!selectedPrinter.value) {
    notify('warn', { 
      detail: 'Выберите принтер'
    })
    return
  }
  
  // Сохранить настройки если нужно
  if (saveAsDefault.value || saveForPage.value) {
    saveSettings()
  }
  
  printing.value = true
  emit('print-start')
  
  try {
    // Получить HTML контент
    let html = props.htmlContent
    if (!html && props.getHtmlContent) {
      html = await props.getHtmlContent()
    }
    
    // Если передан кастомный обработчик печати
    if (props.customPrintHandler) {
      const result = await props.customPrintHandler(
        selectedPrinter.value,
        printOptions.value
      )
      
      notify('success', { 
        detail: result?.message || `Отправлено на печать: ${selectedPrinter.value.short_name}`
      })
      
      emit('print-success', result)
      closeMenu()
      return
    }

    if (!html) {
      throw new Error('HTML контент не предоставлен')
    }
    
    // Проверка на виртуальный PDF принтер
    if (isVirtualPrinter.value) {
      const result = await generatePDF(html)
      
      notify('success', { 
        detail: result.message || 'PDF создан успешно'
      })
      
      emit('print-success', result)
      closeMenu()
      return
    }
    
    // Стандартная логика печати через printserver
    const response = await api_pvPrinter.action('pvprint/print', {
      html: html,
      printer_id: selectedPrinter.value.id,
      options: printOptions.value
    })
    
    if (response.success) {
      notify('success', { 
        detail: response.message || `Отправлено на печать: ${selectedPrinter.value.short_name}`
      })
      
      emit('print-success', response.data)
      closeMenu()
    } else {
      throw new Error(response.message || 'Ошибка печати')
    }
  } catch (error) {
    console.error('Ошибка печати:', error)
    notify('error', { 
      detail: error.message || 'Не удалось отправить на печать'
    })
    
    emit('print-error', error)
  } finally {
    printing.value = false
  }
}

// Директива для клика вне элемента
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

// Lifecycle
onMounted(() => {
  loadPrinters()
})

// Следить за изменением pageKey
watch(() => props.pageKey, () => {
  if (props.pageKey) {
    loadSavedSettings()
  }
})
</script>

<style scoped>
.print-button-wrapper {
  position: relative;
  display: inline-block;
}

.print-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.print-button:hover:not(:disabled) {
  background: #0056b3;
}

.print-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.printer-name {
  font-weight: 500;
}

.dropdown-icon {
  margin-left: 0.25rem;
  font-size: 12px;
}

.print-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  min-width: 300px;
  max-width: 400px;
  z-index: 1000;
}

.menu-section {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

.menu-section:last-child {
  border-bottom: none;
}

.menu-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.printer-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.printer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.printer-item:hover {
  background: #f8f9fa;
}

.printer-item.active {
  background: #e7f3ff;
  color: #007bff;
}

.printer-item i:first-child {
  font-size: 16px;
}

.printer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.printer-short-name {
  font-size: 14px;
  font-weight: 500;
}

.printer-full-name {
  font-size: 11px;
  color: #6c757d;
  line-height: 1.2;
}

.printer-item.active .printer-full-name {
  color: #0056b3;
}

.printer-item i:last-child {
  color: #28a745;
}

.param-group {
  margin-bottom: 0.75rem;
}

.param-group:last-child {
  margin-bottom: 0;
}

.param-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.param-group select,
.param-group input[type="number"] {
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 14px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  transition: border-color 0.2s;
}

.param-group select:focus,
.param-group input[type="number"]:focus {
  outline: none;
  border-color: #007bff;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.no-printers {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}
</style>
