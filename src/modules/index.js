// Автоматический экспорт всех модулей
import PrintSetting from './PrintSetting.vue'

export const modules = {
    PrintSetting
}

// Список доступных модулей для селекта
export const modulesList = Object.keys(modules).map(name => ({ module: name }))
