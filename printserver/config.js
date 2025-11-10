export default {
    // API ключ для аутентификации запросов
    apiKey: 'your-secret-api-key-here',
    
    // Порт сервера
    port: 3200,
    
    // Хост
    host: '0.0.0.0',
    
    // Путь к PDFtoPrinter.exe (только для Windows)
    pdfToPrinterPath: './PDFtoPrinter.exe',
    
    // Директория для временных PDF файлов
    tempDir: './temp',
    
    // Автоочистка заданий старше (мс)
    jobCleanupAge: 3600000, // 1 час
    
    // Интервал проверки очистки (мс)
    jobCleanupInterval: 300000, // 5 минут
    
    // Логирование
    logging: {
        enabled: true,
        level: 'info' // 'debug', 'info', 'warn', 'error'
    }
}
