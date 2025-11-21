<?php

class PVPrint
{
    /** @var modX $modx */
    public $modx;

    /** @var pdoFetch $pdoTools */
    public $pdo;

    /** @var array() $config */
    public $config = array();
    
    public $timings = [];
    protected $start = 0;
    protected $time = 0;
    public $gtsShop;
    public $getTables;
    /**
     * @param modX $modx
     * @param array $config
     */
    function __construct(modX &$modx, array $config = [])
    {
        $this->modx =& $modx;
        $corePath = MODX_CORE_PATH . 'components/pvprint/';
        // $assetsUrl = MODX_ASSETS_URL . 'components/pvprint/';

        $this->config = array_merge([
            'corePath' => $corePath,
            'modelPath' => $corePath . 'model/',
            // 'processorsPath' => $corePath . 'processors/',
            // 'customPath' => $corePath . 'custom/',

            // 'connectorUrl' => $assetsUrl . 'connector.php',
            // 'assetsUrl' => $assetsUrl,
            // 'cssUrl' => $assetsUrl . 'css/',
            // 'jsUrl' => $assetsUrl . 'js/',
        ], $config);

        $this->modx->addPackage('pvprint', $this->config['modelPath']);
        
        if ($this->pdo = $this->modx->getService('pdoFetch')) {
            $this->pdo->setConfig($this->config);
        }
        $this->timings = [];
        $this->time = $this->start = microtime(true);
    }
    /**
     * Add new record to time log
     *
     * @param $message
     * @param null $delta
     */
    public function addTime($message, $delta = null)
    {
        $time = microtime(true);
        if (!$delta) {
            $delta = $time - $this->time;
        }

        $this->timings[] = array(
            'time' => number_format(round(($delta), 7), 7),
            'message' => $message,
        );
        $this->time = $time;
    }
    /**
     * Return timings log
     *
     * @param bool $string Return array or formatted string
     *
     * @return array|string
     */
    public function getTime($string = true)
    {
        $this->timings[] = array(
            'time' => number_format(round(microtime(true) - $this->start, 7), 7),
            'message' => '<b>Total time</b>',
        );
        $this->timings[] = array(
            'time' => number_format(round((memory_get_usage(true)), 2), 0, ',', ' '),
            'message' => '<b>Memory usage</b>',
        );

        if (!$string) {
            return $this->timings;
        } else {
            $res = '';
            foreach ($this->timings as $v) {
                $res .= $v['time'] . ': ' . $v['message'] . "\n";
            }

            return $res;
        }
    }
    
    public function success($message = "",$data = []){
        return array('success'=>1,'message'=>$message,'data'=>$data);
    }
    public function error($message = "",$data = []){
        return array('success'=>0,'message'=>$message,'data'=>$data);
    }
    public function checkPermissions($rule_action){
        // $this->modx->log(1,"checkPermissions ".print_r($rule_action,1));
        if(isset($rule_action['authenticated']) and $rule_action['authenticated'] == 1){
            if(!$this->modx->user->id > 0) return $this->error("Not api authenticated!",['user_id'=>$this->modx->user->id]);
        }

        if(isset($rule_action['groups']) and !empty($rule_action['groups'])){
            // $this->modx->log(1,"checkPermissions groups".print_r($rule_action['groups'],1));
            $groups = array_map('trim', explode(',', $rule_action['groups']));
            if(!$this->modx->user->isMember($groups)) return $this->error("Not api permission groups!");
        }
        if(isset($rule_action['permissions'])and !empty($rule_action['permissions'])){
            $permissions = array_map('trim', explode(',', $rule_action['permissions']));
            foreach($permissions as $pm){
                if(!$this->modx->hasPermission($pm)) return $this->error("Not api modx permission!");
            }
        }
        return $this->success();
    }
    
    /**
     * Печать HTML через принт-сервер
     * 
     * @param string $html HTML код для печати
     * @param string|int $printer Имя принтера или ID принтера из базы
     * @param array $pageOptions Параметры страницы
     * @param int $serverId ID принт-сервера (опционально, определяется автоматически)
     * @return array Результат операции
     */
    public function printHTML($html, $printer, $pageOptions = [], $serverId = null)
    {
        $printerName = $printer;
        
        // Если передан ID принтера (число), получить данные из базы
        if (is_numeric($printer)) {
            $printerObj = $this->modx->getObject('pvPrinter', [
                'id' => $printer,
                'active' => 1
            ]);
            
            if (!$printerObj) {
                return $this->error('Принтер с ID ' . $printer . ' не найден или неактивен');
            }
            
            $printerName = $printerObj->get('name');
            $serverId = $printerObj->get('server_id');
        } 
        // Если передано имя принтера (строка), попробовать найти в базе
        else {
            $printerObj = $this->modx->getObject('pvPrinter', [
                'name' => $printer,
                'active' => 1
            ]);
            
            // Если принтер найден в базе, использовать его server_id
            if ($printerObj && !$serverId) {
                $serverId = $printerObj->get('server_id');
            }
        }
        
        // Получение принт-сервера
        if ($serverId) {
            $server = $this->modx->getObject('pvPrintServer', [
                'id' => $serverId,
                'active' => 1
            ]);
        } else {
            // Получить первый активный сервер (если принтер не найден в базе)
            $server = $this->modx->getObject('pvPrintServer', ['active' => 1]);
        }
        
        if (!$server) {
            return $this->error('Принт-сервер не найден или неактивен');
        }
        
        $serverUrl = rtrim($server->get('url'), '/');
        $apiKey = $server->get('api_key');
        
        if (empty($serverUrl) || empty($apiKey)) {
            return $this->error('Некорректная конфигурация принт-сервера');
        }
        
        // Валидация обязательных параметров
        if (empty($html)) {
            return $this->error('HTML код не может быть пустым');
        }
        
        if (empty($printerName)) {
            return $this->error('Имя принтера не указано');
        }
        
        // Подготовка параметров страницы
        $options = [
            'format' => isset($pageOptions['format']) ? $pageOptions['format'] : 'A4',
            'orientation' => isset($pageOptions['orientation']) ? $pageOptions['orientation'] : 'portrait',
            'margin' => isset($pageOptions['margin']) ? $pageOptions['margin'] : [
                'top' => '20mm',
                'right' => '15mm',
                'bottom' => '20mm',
                'left' => '15mm'
            ],
            'copies' => isset($pageOptions['copies']) ? (int)$pageOptions['copies'] : 1
        ];
        
        // Подготовка данных для отправки
        $postData = [
            'html' => $html,
            'printer' => $printerName,
            'options' => $options
        ];
        
        // Отправка запроса на принт-сервер
        $ch = curl_init($serverUrl . '/print');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        // Обработка ошибок curl
        if ($curlError) {
            $this->modx->log(modX::LOG_LEVEL_ERROR, '[PVPrint] Ошибка curl: ' . $curlError);
            return $this->error('Ошибка соединения с принт-сервером: ' . $curlError);
        }
        
        // Обработка HTTP ошибок
        if ($httpCode !== 200) {
            $this->modx->log(modX::LOG_LEVEL_ERROR, '[PVPrint] HTTP код: ' . $httpCode . ', ответ: ' . $response);
            return $this->error('Ошибка принт-сервера (HTTP ' . $httpCode . ')');
        }
        
        // Декодирование ответа
        $result = json_decode($response, true);
        
        if (!$result) {
            $this->modx->log(modX::LOG_LEVEL_ERROR, '[PVPrint] Некорректный JSON ответ: ' . $response);
            return $this->error('Некорректный ответ от принт-сервера');
        }
        
        // Проверка успешности операции
        if (!isset($result['success']) || !$result['success']) {
            $errorMsg = isset($result['error']) ? $result['error'] : 'Неизвестная ошибка';
            $this->modx->log(modX::LOG_LEVEL_ERROR, '[PVPrint] Ошибка печати: ' . $errorMsg);
            return $this->error($errorMsg);
        }
        
        // Возврат успешного результата
        return $this->success('Задание отправлено на печать', [
            'job_id' => isset($result['job_id']) ? $result['job_id'] : null,
            'status' => isset($result['status']) ? $result['status'] : 'queued',
            'server' => $server->get('name'),
            'printer' => $printer
        ]);
    }
    
    /**
     * Получить статус задания печати
     * 
     * @param string $jobId ID задания
     * @param int $serverId ID принт-сервера (опционально)
     * @return array Результат операции
     */
    public function getPrintJobStatus($jobId, $serverId = null)
    {
        // Получение принт-сервера
        if ($serverId) {
            $server = $this->modx->getObject('pvPrintServer', [
                'id' => $serverId,
                'active' => 1
            ]);
        } else {
            $server = $this->modx->getObject('pvPrintServer', ['active' => 1]);
        }
        
        if (!$server) {
            return $this->error('Принт-сервер не найден');
        }
        
        $serverUrl = rtrim($server->get('url'), '/');
        $apiKey = $server->get('api_key');
        
        // Отправка запроса
        $ch = curl_init($serverUrl . '/print/status/' . $jobId);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Key: ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            return $this->error('Ошибка получения статуса (HTTP ' . $httpCode . ')');
        }
        
        $result = json_decode($response, true);
        
        if (!$result || !isset($result['success']) || !$result['success']) {
            return $this->error('Не удалось получить статус задания');
        }
        
        return $this->success('Статус получен', $result['job']);
    }
    
    /**
     * Получить список принтеров с принт-сервера
     * 
     * @param int $serverId ID принт-сервера (опционально)
     * @return array Результат операции
     */
    public function getPrinters($serverId = null)
    {
        // Получение принт-сервера
        if ($serverId) {
            $server = $this->modx->getObject('pvPrintServer', [
                'id' => $serverId,
                'active' => 1
            ]);
        } else {
            $server = $this->modx->getObject('pvPrintServer', ['active' => 1]);
        }
        
        if (!$server) {
            return $this->error('Принт-сервер не найден');
        }
        
        $serverUrl = rtrim($server->get('url'), '/');
        $apiKey = $server->get('api_key');
        
        // Отправка запроса
        $ch = curl_init($serverUrl . '/getprinters');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            return $this->error('Ошибка получения списка принтеров (HTTP ' . $httpCode . ')');
        }
        
        $result = json_decode($response, true);
        
        if (!$result || !isset($result['success']) || !$result['success']) {
            return $this->error('Не удалось получить список принтеров');
        }
        
        return $this->success('Список принтеров получен', [
            'printers' => $result['printers'],
            'count' => $result['count'],
            'os' => $result['os'],
            'server' => $server->get('name')
        ]);
    }
    
    /**
     * Синхронизация принтеров с принт-сервера в базу данных
     * Кастомное действие для gtsAPI
     * 
     * @param array $data Данные от gtsAPI (содержит id сервера)
     * @return array Результат операции
     */
    public function sync_printers($data = [])
    {
        // Получение ID сервера из данных
        $serverId = isset($data['id']) ? (int)$data['id'] : null;
        
        if (!$serverId) {
            return $this->error('ID принт-сервера не указан');
        }
        
        // Получение принт-сервера
        $server = $this->modx->getObject('pvPrintServer', [
            'id' => $serverId,
            'active' => 1
        ]);
        
        if (!$server) {
            return $this->error('Принт-сервер не найден или неактивен');
        }
        
        // Получение списка принтеров с сервера
        $printersResult = $this->getPrinters($serverId);
        
        if (!$printersResult['success']) {
            return $printersResult;
        }
        
        $remotePrinters = $printersResult['data']['printers'];
        
        // Получение или создание группы по умолчанию
        $defaultGroup = $this->modx->getObject('pvPrinterGroup', ['name' => 'По умолчанию']);
        if (!$defaultGroup) {
            $defaultGroup = $this->modx->newObject('pvPrinterGroup');
            $defaultGroup->set('name', 'По умолчанию');
            $defaultGroup->set('description', 'Группа по умолчанию для синхронизированных принтеров');
            $defaultGroup->set('active', 1);
            $defaultGroup->set('created_at', date('Y-m-d H:i:s'));
            $defaultGroup->save();
        }
        
        $defaultGroupId = $defaultGroup->get('id');
        
        // Счетчики
        $added = 0;
        $updated = 0;
        $skipped = 0;
        
        // Обработка каждого принтера
        foreach ($remotePrinters as $remotePrinter) {
            $printerName = $remotePrinter['name'];
            
            if (empty($printerName)) {
                $skipped++;
                continue;
            }
            
            // Проверка существования принтера
            $existingPrinter = $this->modx->getObject('pvPrinter', [
                'server_id' => $serverId,
                'name' => $printerName
            ]);
            
            if ($existingPrinter) {
                // Обновление существующего принтера
                $existingPrinter->set('updated_at', date('Y-m-d H:i:s'));
                
                // Обновить статус если изменился
                $newStatus = (isset($remotePrinter['status']) && 
                             in_array($remotePrinter['status'], ['Normal', 'Idle'])) ? 1 : 0;
                
                if ($existingPrinter->get('active') != $newStatus) {
                    $existingPrinter->set('active', $newStatus);
                }
                
                $existingPrinter->save();
                $updated++;
            } else {
                // Создание нового принтера
                $newPrinter = $this->modx->newObject('pvPrinter');
                $newPrinter->set('server_id', $serverId);
                $newPrinter->set('group_id', $defaultGroupId);
                $newPrinter->set('name', $printerName);
                
                // Генерация короткого имени
                $shortName = $this->generateShortName($printerName);
                $newPrinter->set('short_name', $shortName);
                
                // Описание из драйвера и порта
                $description = [];
                if (!empty($remotePrinter['driver'])) {
                    $description[] = 'Драйвер: ' . $remotePrinter['driver'];
                }
                if (!empty($remotePrinter['port'])) {
                    $description[] = 'Порт: ' . $remotePrinter['port'];
                }
                $newPrinter->set('description', implode("\n", $description));
                
                // Статус
                $active = (isset($remotePrinter['status']) && 
                          in_array($remotePrinter['status'], ['Normal', 'Idle'])) ? 1 : 0;
                $newPrinter->set('active', $active);
                
                $newPrinter->set('created_at', date('Y-m-d H:i:s'));
                $newPrinter->save();
                $added++;
            }
        }
        
        // Формирование сообщения
        $message = sprintf(
            'Синхронизация завершена: добавлено %d, обновлено %d, пропущено %d',
            $added,
            $updated,
            $skipped
        );
        
        $this->modx->log(modX::LOG_LEVEL_INFO, '[PVPrint] ' . $message);
        
        return $this->success($message, [
            'added' => $added,
            'updated' => $updated,
            'skipped' => $skipped,
            'total' => count($remotePrinters),
            'refresh_table' => 1  // Обновить таблицу в интерфейсе
        ]);
    }
    
    /**
     * Генерация короткого имени принтера
     * Если имя короче 10 символов - возвращает как есть
     * Иначе: первые 3 символа первого слова + последнее слово, обрезает до 10 символов
     * 
     * @param string $fullName Полное имя принтера
     * @return string Короткое имя (максимум 10 символов)
     */
    private function generateShortName($fullName)
    {
        // Удалить спецсимволы, оставить только буквы, цифры
        $cleanName = preg_replace('/[^a-zA-Z0-9]+/', '', $fullName);
        
        // Если после очистки имя короче 10 символов - вернуть как есть
        if (strlen($cleanName) <= 10) {
            $shortName = strtolower($cleanName);
        } else {
            // Разбить на слова (по пробелам и спецсимволам)
            $words = preg_split('/[^a-zA-Z0-9]+/', $fullName, -1, PREG_SPLIT_NO_EMPTY);
            
            if (empty($words)) {
                $shortName = 'printer';
            } elseif (count($words) == 1) {
                // Одно длинное слово - взять первые 10 символов
                $shortName = substr($words[0], 0, 10);
            } else {
                // Несколько слов: первые 3 символа первого слова + последнее слово
                $firstPart = substr($words[0], 0, 3);
                $lastWord = $words[count($words) - 1];
                $shortName = $firstPart . $lastWord;
                
                // Обрезать до 10 символов
                if (strlen($shortName) > 10) {
                    $shortName = substr($shortName, 0, 10);
                }
            }
            
            // Привести к нижнему регистру
            $shortName = strtolower($shortName);
        }
        
        // Убедиться что имя уникально
        $counter = 1;
        $originalShortName = $shortName;
        
        while ($this->modx->getCount('pvPrinter', ['short_name' => $shortName]) > 0) {
            // Для уникальности добавляем цифру в конец
            // Если shortName длиной 10, обрезаем на 1 символ чтобы добавить цифру
            if (strlen($originalShortName) >= 10) {
                $shortName = substr($originalShortName, 0, 9) . $counter;
            } else {
                $shortName = $originalShortName . $counter;
            }
            
            $counter++;
            
            // Защита от бесконечного цикла
            if ($counter > 99) {
                $shortName = substr($originalShortName, 0, 6) . (time() % 10000);
                break;
            }
        }
        
        return $shortName;
    }
    /**
     * Обёртка для printHTML - обрабатывает данные от gtsAPI
     * 
     * @param array $data Данные от gtsAPI:
     *   - html: HTML код для печати
     *   - printer_id: ID принтера из базы
     *   - options: Параметры печати (format, orientation, copies)
     * @return array Результат операции
     */
    public function print($data = [])
    {
        // Валидация входных данных
        if (!isset($data['html']) || empty($data['html'])) {
            return $this->error('HTML код не предоставлен');
        }
        
        if (!isset($data['printer_id']) || empty($data['printer_id'])) {
            return $this->error('ID принтера не указан');
        }
        
        $html = $data['html'];
        $printerId = $data['printer_id'];
        $options = isset($data['options']) ? $data['options'] : [];
        
        // Вызов printHTML с ID принтера
        $result = $this->printHTML($html, $printerId, $options);
        
        return $result;
    }
    
    /**
     * Обработчик API запросов
     * @param string $action Название действия
     * @param array $data Данные запроса
     * @return array
     */
    public function handleRequest($action, $data = array()) {
        switch($action) {
            case 'sync_printers':
                return $this->sync_printers($data);
            break;
            case 'print':
                return $this->print($data);
            break;
            default:
                return $this->error("Неизвестное действие: {$action}");
        }
    }
}
