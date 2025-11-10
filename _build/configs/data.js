export default {
    pvprint: {
        // Группа для виртуальных принтеров
        pvPrinterGroup: {
            key: "id",
            rows: [
                {
                    id: 1,
                    name: "Виртуальные принтеры",
                    description: "Группа виртуальных принтеров (PDF и другие)",
                    active: 1,
                    created_at: "2025-01-01 00:00:00"
                }
            ]
        },
        
        // Виртуальный PDF принтер
        pvPrinter: {
            key: "id",
            rows: [
                {
                    id: 1,
                    server_id: 0,  // 0 = без сервера
                    group_id: 1,   // группа виртуальных принтеров
                    short_name: "pdf",
                    name: "Виртуальный PDF принтер",
                    description: "Генерация PDF в браузере без принт-сервера. Открывает PDF в новой вкладке для просмотра и сохранения.",
                    is_virtual: 1,
                    active: 1,
                    created_at: "2025-01-01 00:00:00"
                }
            ]
        }
    },
   
}
