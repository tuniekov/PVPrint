import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Динамический импорт Puppeteer
let puppeteer;
try {
    puppeteer = await import('puppeteer');
} catch (error) {
    console.error('Puppeteer не установлен. Выполните: npm install');
    process.exit(1);
}

// Создание директории для временных файлов
const tempDir = path.join(__dirname, config.tempDir);
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Логирование
function log(level, message, data = null) {
    if (!config.logging.enabled) return;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(config.logging.level);
    const currentLevel = levels.indexOf(level);
    
    if (currentLevel >= configLevel) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        console.log(logMessage);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

// Определение операционной системы
function getOS() {
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    if (platform === 'linux') return 'linux';
    if (platform === 'darwin') return 'macos';
    return 'unknown';
}

// Система очереди печати
class PrintQueue {
    constructor() {
        this.jobs = new Map();
        this.processing = false;
    }
    
    add(jobData) {
        const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const job = {
            id,
            ...jobData,
            status: 'queued',
            created_at: new Date(),
            completed_at: null,
            error: null
        };
        
        this.jobs.set(id, job);
        log('info', `Задание добавлено в очередь: ${id}`);
        
        // Запустить обработку
        this.processNext();
        
        return id;
    }
    
    get(id) {
        return this.jobs.get(id);
    }
    
    getAll() {
        return Array.from(this.jobs.values());
    }
    
    async processNext() {
        if (this.processing) {
            log('debug', 'Обработка уже выполняется');
            return;
        }
        
        const queuedJob = Array.from(this.jobs.values())
            .find(j => j.status === 'queued');
        
        if (!queuedJob) {
            log('debug', 'Нет заданий в очереди');
            return;
        }
        
        this.processing = true;
        queuedJob.status = 'processing';
        log('info', `Начало обработки задания: ${queuedJob.id}`);
        
        try {
            await this.execute(queuedJob);
            queuedJob.status = 'completed';
            queuedJob.completed_at = new Date();
            log('info', `Задание выполнено: ${queuedJob.id}`);
        } catch (error) {
            queuedJob.status = 'failed';
            queuedJob.error = error.message;
            queuedJob.completed_at = new Date();
            log('error', `Ошибка выполнения задания ${queuedJob.id}:`, error.message);
        }
        
        this.processing = false;
        
        // Обработать следующее задание
        setTimeout(() => this.processNext(), 100);
    }
    
    async execute(job) {
        log('debug', `Выполнение задания ${job.id}`, {
            printer: job.printer,
            options: job.options
        });
        
        // 1. Генерация PDF
        const pdfBuffer = await generatePDF(job.html, job.options);
        
        // 2. Сохранение во временный файл
        const tempFile = path.join(tempDir, `${job.id}.pdf`);
        await fs.promises.writeFile(tempFile, pdfBuffer);
        log('debug', `PDF сохранен: ${tempFile}`);
        
        // 3. Печать
        await printPDF(tempFile, job.printer, job.options);
        
        // 4. Удаление временного файла
        try {
            await fs.promises.unlink(tempFile);
            log('debug', `Временный файл удален: ${tempFile}`);
        } catch (error) {
            log('warn', `Не удалось удалить временный файл: ${tempFile}`);
        }
    }
    
    cleanup() {
        const now = Date.now();
        const cutoff = now - config.jobCleanupAge;
        
        let cleaned = 0;
        for (const [id, job] of this.jobs) {
            if (job.created_at.getTime() < cutoff) {
                this.jobs.delete(id);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            log('info', `Очищено старых заданий: ${cleaned}`);
        }
    }
}

const printQueue = new PrintQueue();

// Генерация PDF из HTML
async function generatePDF(html, options = {}) {
    log('debug', 'Генерация PDF из HTML');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfOptions = {
            format: options.format || 'A4',
            landscape: options.orientation === 'landscape',
            margin: options.margin || {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            printBackground: true
        };
        
        const pdfBuffer = await page.pdf(pdfOptions);
        log('debug', 'PDF успешно сгенерирован');
        
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

// Печать PDF
async function printPDF(pdfPath, printerName, options = {}) {
    const osType = getOS();
    const copies = options.copies || 1;
    
    log('debug', `Печать PDF на ${osType}`, {
        file: pdfPath,
        printer: printerName,
        copies
    });
    
    if (osType === 'windows') {
        // Windows: PDFtoPrinter
        const pdfToPrinter = path.join(__dirname, config.pdfToPrinterPath);
        
        if (!fs.existsSync(pdfToPrinter)) {
            throw new Error(`PDFtoPrinter.exe не найден: ${pdfToPrinter}`);
        }
        
        const command = `"${pdfToPrinter}" "${pdfPath}" "${printerName}"`;
        
        // PDFtoPrinter не поддерживает количество копий напрямую,
        // поэтому печатаем несколько раз
        for (let i = 0; i < copies; i++) {
            await execAsync(command);
        }
        
        log('info', `PDF отправлен на печать (Windows): ${printerName}`);
    } else {
        // Linux/macOS: lp
        const command = `lp -d "${printerName}" -n ${copies} "${pdfPath}"`;
        await execAsync(command);
        log('info', `PDF отправлен на печать (Linux/macOS): ${printerName}`);
    }
}

// Получение принтеров для Windows
async function getWindowsPrinters() {
    try {
        log('debug', 'Получение принтеров Windows через PowerShell');
        
        const command = 'powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, Shared, Published, PrinterStatus | ConvertTo-Json"';
        
        const { stdout, stderr } = await execAsync(command, { 
            encoding: 'utf8',
            maxBuffer: 1024 * 1024
        });
        
        if (stderr) {
            log('warn', 'PowerShell stderr:', stderr);
        }
        
        if (!stdout || stdout.trim() === '') {
            log('info', 'Принтеры не найдены');
            return [];
        }
        
        let printers = JSON.parse(stdout);
        
        if (!Array.isArray(printers)) {
            printers = [printers];
        }
        
        const formattedPrinters = printers.map(printer => ({
            name: printer.Name || '',
            driver: printer.DriverName || '',
            port: printer.PortName || '',
            shared: printer.Shared || false,
            published: printer.Published || false,
            status: printer.PrinterStatus || 'Unknown',
            type: 'local'
        }));
        
        log('info', `Найдено принтеров Windows: ${formattedPrinters.length}`);
        return formattedPrinters;
        
    } catch (error) {
        log('error', 'Ошибка получения принтеров Windows:', error.message);
        throw new Error(`Ошибка получения принтеров Windows: ${error.message}`);
    }
}

// Получение принтеров для Linux
async function getLinuxPrinters() {
    try {
        log('debug', 'Получение принтеров Linux через lpstat');
        
        const { stdout: printerList } = await execAsync('lpstat -p', { 
            encoding: 'utf8',
            maxBuffer: 1024 * 1024
        });
        
        if (!printerList || printerList.trim() === '') {
            log('info', 'Принтеры не найдены');
            return [];
        }
        
        const printers = [];
        const lines = printerList.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            const match = line.match(/^printer\s+(\S+)\s+(.+)$/);
            if (match) {
                const printerName = match[1];
                const statusText = match[2];
                
                try {
                    const { stdout: deviceInfo } = await execAsync(`lpstat -v ${printerName}`, {
                        encoding: 'utf8'
                    });
                    
                    let device = '';
                    const deviceMatch = deviceInfo.match(/device for .+:\s*(.+)$/m);
                    if (deviceMatch) {
                        device = deviceMatch[1].trim();
                    }
                    
                    let status = 'Unknown';
                    if (statusText.includes('idle')) status = 'Idle';
                    else if (statusText.includes('processing')) status = 'Processing';
                    else if (statusText.includes('disabled')) status = 'Disabled';
                    
                    printers.push({
                        name: printerName,
                        driver: '',
                        port: device,
                        shared: false,
                        published: false,
                        status: status,
                        type: 'local'
                    });
                    
                } catch (error) {
                    log('warn', `Ошибка получения информации о принтере ${printerName}:`, error.message);
                    printers.push({
                        name: printerName,
                        driver: '',
                        port: '',
                        shared: false,
                        published: false,
                        status: statusText.includes('idle') ? 'Idle' : 'Unknown',
                        type: 'local'
                    });
                }
            }
        }
        
        log('info', `Найдено принтеров Linux: ${printers.length}`);
        return printers;
        
    } catch (error) {
        log('error', 'Ошибка получения принтеров Linux:', error.message);
        throw new Error(`Ошибка получения принтеров Linux: ${error.message}`);
    }
}

// Получение принтеров в зависимости от ОС
async function getPrinters() {
    const osType = getOS();
    log('info', `Определена ОС: ${osType}`);
    
    switch (osType) {
        case 'windows':
            return await getWindowsPrinters();
        case 'linux':
            return await getLinuxPrinters();
        case 'macos':
            return await getLinuxPrinters();
        default:
            throw new Error(`Неподдерживаемая операционная система: ${osType}`);
    }
}

// Проверка API ключа
function validateApiKey(apiKey) {
    return apiKey === config.apiKey;
}

// Валидация параметров печати
function validatePrintOptions(options) {
    const errors = [];
    
    const validFormats = ['A4', 'A3', 'Letter', 'Legal', 'Tabloid'];
    if (options.format && !validFormats.includes(options.format)) {
        errors.push(`Неверный формат: ${options.format}. Допустимые: ${validFormats.join(', ')}`);
    }
    
    const validOrientations = ['portrait', 'landscape'];
    if (options.orientation && !validOrientations.includes(options.orientation)) {
        errors.push(`Неверная ориентация: ${options.orientation}. Допустимые: ${validOrientations.join(', ')}`);
    }
    
    if (options.copies && (options.copies < 1 || options.copies > 999)) {
        errors.push('Количество копий должно быть от 1 до 999');
    }
    
    return errors;
}

// Парсинг тела POST запроса
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                resolve(data);
            } catch (error) {
                reject(new Error('Неверный формат JSON'));
            }
        });
        
        req.on('error', error => {
            reject(error);
        });
    });
}

// Отправка JSON ответа
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
    });
    res.end(JSON.stringify(data, null, 2));
}

// Создание HTTP сервера
const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    
    log('debug', `${method} ${url}`);
    
    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
        });
        res.end();
        return;
    }
    
    // Обработка POST /getprinters
    if (method === 'POST' && url === '/getprinters') {
        try {
            const body = await parseBody(req);
            const apiKey = req.headers['x-api-key'] || body.api_key;
            
            if (!apiKey) {
                log('warn', 'Запрос без API ключа');
                sendJSON(res, 401, {
                    success: false,
                    error: 'API ключ не предоставлен'
                });
                return;
            }
            
            if (!validateApiKey(apiKey)) {
                log('warn', 'Неверный API ключ');
                sendJSON(res, 403, {
                    success: false,
                    error: 'Неверный API ключ'
                });
                return;
            }
            
            log('info', 'Запрос на получение принтеров');
            const printers = await getPrinters();
            
            sendJSON(res, 200, {
                success: true,
                os: getOS(),
                count: printers.length,
                printers: printers
            });
            
        } catch (error) {
            log('error', 'Ошибка обработки запроса:', error.message);
            sendJSON(res, 500, {
                success: false,
                error: error.message
            });
        }
        return;
    }
    
    // Обработка POST /print
    if (method === 'POST' && url === '/print') {
        try {
            const body = await parseBody(req);
            const apiKey = req.headers['x-api-key'] || body.api_key;
            
            if (!apiKey) {
                sendJSON(res, 401, {
                    success: false,
                    error: 'API ключ не предоставлен'
                });
                return;
            }
            
            if (!validateApiKey(apiKey)) {
                sendJSON(res, 403, {
                    success: false,
                    error: 'Неверный API ключ'
                });
                return;
            }
            
            // Валидация обязательных полей
            if (!body.html) {
                sendJSON(res, 400, {
                    success: false,
                    error: 'Поле html обязательно'
                });
                return;
            }
            console.log('body.printer',body.printer)
            if (!body.printer) {
                sendJSON(res, 400, {
                    success: false,
                    error: 'Поле printer обязательно'
                });
                return;
            }
            
            // Валидация опций
            const options = body.options || {};
            const validationErrors = validatePrintOptions(options);
            
            if (validationErrors.length > 0) {
                sendJSON(res, 400, {
                    success: false,
                    error: 'Ошибки валидации',
                    errors: validationErrors
                });
                return;
            }
            
            // Добавление задания в очередь
            const jobId = printQueue.add({
                html: body.html,
                printer: body.printer,
                options: {
                    format: options.format || 'A4',
                    orientation: options.orientation || 'portrait',
                    margin: options.margin || {
                        top: '10mm',
                        right: '10mm',
                        bottom: '10mm',
                        left: '10mm'
                    },
                    copies: options.copies || 1
                }
            });
            
            sendJSON(res, 200, {
                success: true,
                job_id: jobId,
                status: 'queued',
                message: 'Задание добавлено в очередь'
            });
            
        } catch (error) {
            log('error', 'Ошибка обработки запроса печати:', error.message);
            sendJSON(res, 500, {
                success: false,
                error: error.message
            });
        }
        return;
    }
    
    // Обработка GET /print/status/:job_id
    if (method === 'GET' && url.startsWith('/print/status/')) {
        const jobId = url.split('/')[3];
        const job = printQueue.get(jobId);
        
        if (!job) {
            sendJSON(res, 404, {
                success: false,
                error: 'Задание не найдено'
            });
            return;
        }
        
        sendJSON(res, 200, {
            success: true,
            job: {
                id: job.id,
                status: job.status,
                printer: job.printer,
                created_at: job.created_at,
                completed_at: job.completed_at,
                error: job.error
            }
        });
        return;
    }
    
    // Обработка GET /print/queue
    if (method === 'GET' && url === '/print/queue') {
        const jobs = printQueue.getAll().map(job => ({
            id: job.id,
            status: job.status,
            printer: job.printer,
            created_at: job.created_at
        }));
        
        sendJSON(res, 200, {
            success: true,
            queue: jobs,
            total: jobs.length
        });
        return;
    }
    
    // Обработка GET / (информация о сервере)
    if (method === 'GET' && url === '/') {
        sendJSON(res, 200, {
            name: 'Print Server API',
            version: '2.0.0',
            os: getOS(),
            endpoints: {
                '/getprinters': {
                    method: 'POST',
                    description: 'Получить список принтеров',
                    auth: 'API Key (header: X-API-Key или body: api_key)'
                },
                '/print': {
                    method: 'POST',
                    description: 'Отправить HTML на печать',
                    auth: 'API Key',
                    params: {
                        html: 'HTML код (обязательно)',
                        printer: 'Имя принтера (обязательно)',
                        options: {
                            format: 'A4, A3, Letter, Legal, Tabloid',
                            orientation: 'portrait, landscape',
                            margin: 'объект с top, right, bottom, left',
                            copies: 'количество копий (1-999)'
                        }
                    }
                },
                '/print/status/:job_id': {
                    method: 'GET',
                    description: 'Получить статус задания печати'
                },
                '/print/queue': {
                    method: 'GET',
                    description: 'Получить текущую очередь печати'
                }
            }
        });
        return;
    }
    
    // 404 для остальных запросов
    sendJSON(res, 404, {
        success: false,
        error: 'Endpoint не найден'
    });
});

// Запуск сервера
server.listen(config.port, config.host, () => {
    log('info', `Print Server запущен на http://${config.host}:${config.port}`);
    log('info', `Операционная система: ${getOS()}`);
    log('info', `API ключ настроен: ${config.apiKey !== 'your-secret-api-key-here'}`);
    log('info', `Puppeteer установлен: да`);
    log('info', `Директория temp: ${tempDir}`);
});

// Автоочистка старых заданий
setInterval(() => {
    printQueue.cleanup();
}, config.jobCleanupInterval);

// Обработка ошибок
server.on('error', (error) => {
    log('error', 'Ошибка сервера:', error.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('info', 'Получен SIGTERM, завершение работы...');
    server.close(() => {
        log('info', 'Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log('info', 'Получен SIGINT, завершение работы...');
    server.close(() => {
        log('info', 'Сервер остановлен');
        process.exit(0);
    });
});
