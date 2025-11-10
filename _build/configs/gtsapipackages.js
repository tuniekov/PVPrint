export default {
    pvprint:{
        name:'pvprint',
        gtsAPITables:{
            pvPrintServer:{
                table:'pvPrintServer',
                class:'pvPrintServer',
                autocomplete_field:'name',
                version:1,
                type: 1,
                authenticated:true,
                groups:'Administrator',
                permissions:'',
                active:true,
                properties: {
                    autocomplete:{
                        select:['id','name','url'],
                        tpl:'{$name} ({$url})',
                        where:{
                            "name:LIKE":"%query%",
                        },
                        limit:0,
                    },
                    actions:{
                        read:{},
                        create:{groups:'Administrator'},
                        update:{groups:'Administrator'},
                        delete:{groups:'Administrator'},
                        sync_printers:{
                            action:'pvprint/sync_printers',
                            row:true,
                            icon:'pi pi-sync',
                            label:'Синхронизировать принтеры',
                            groups:'Administrator'
                        }
                    },
                    fields: {
                        "id": {
                            "type": "view"
                        },
                        "name": {
                            "label":"Название",
                            "type": "text",
                            "required": true,
                            "desc": "Уникальное название принт-сервера"
                        },
                        "url": {
                            "label":"URL",
                            "type": "text",
                            "required": true,
                            "desc": "Адрес принт-сервера (например: http://printserver:631)"
                        },
                        "api_key": {
                            "label":"API ключ",
                            "type": "text",
                            "required": true,
                            "desc": "Ключ для доступа к API принт-сервера"
                        },
                        "active": {
                            "label":"Активен",
                            "type": "boolean"
                        },
                        "created_at": {
                            "label":"Создан",
                            "type": "date",
                            "readonly": true,
                            "table_only": true
                        },
                        "updated_at": {
                            "label":"Обновлен",
                            "type": "date",
                            "readonly": true,
                            "table_only": true
                        }
                    }
                }
            },
            pvPrinterGroup:{
                table:'pvPrinterGroup',
                class:'pvPrinterGroup',
                autocomplete_field:'name',
                version:1,
                type: 1,
                authenticated:true,
                groups:'Administrator',
                permissions:'',
                active:true,
                properties: {
                    autocomplete:{
                        select:['id','name'],
                        tpl:'{$name}',
                        where:{
                            "name:LIKE":"%query%",
                        },
                        limit:0,
                    },
                    actions:{
                        read:{},
                        create:{groups:'Administrator'},
                        update:{groups:'Administrator'},
                        delete:{groups:'Administrator'},
                    },
                    fields: {
                        "id": {
                            "type": "view"
                        },
                        "name": {
                            "label":"Название группы",
                            "type": "text",
                            "required": true,
                            "desc": "Название группы принтеров"
                        },
                        "description": {
                            "label":"Описание",
                            "type": "textarea",
                            "desc": "Описание назначения группы"
                        },
                        "active": {
                            "label":"Активна",
                            "type": "boolean"
                        },
                        "created_at": {
                            "label":"Создана",
                            "type": "date",
                            "readonly": true,
                            "table_only": true
                        },
                        "updated_at": {
                            "label":"Обновлена",
                            "type": "date",
                            "readonly": true,
                            "table_only": true
                        }
                    }
                }
            },
            pvPrinter:{
                table:'pvPrinter',
                autocomplete_field:'name',
                version:1,
                type: 1,
                authenticated:true,
                groups:'',
                permissions:'',
                active:true,
                properties: {
                    autocomplete:{
                        select:['id','name','short_name'],
                        tpl:'{$name} ({$short_name})',
                        where:{
                            "name:LIKE":"%query%",
                        },
                        limit:0,
                    },
                    actions:{
                        read:{},
                        create:{groups:'Administrator'},
                        update:{groups:'Administrator'},
                        delete:{groups:'Administrator'},
                    },
                    fields: {
                        "id": {
                            "type": "view"
                        },
                        "server_id": {
                            "label":"Принт-сервер",
                            "type": "autocomplete",
                            "table": "pvPrintServer",
                            "required": true,
                            "desc": "Выберите принт-сервер"
                        },
                        "server_name": {
                            "label":"Сервер",
                            "type": "view",
                            "table_only": true
                        },
                        "group_id": {
                            "label":"Группа",
                            "type": "autocomplete",
                            "table": "pvPrinterGroup",
                            "required": true,
                            "desc": "Выберите группу принтеров"
                        },
                        "short_name": {
                            "label":"Короткое имя",
                            "type": "text",
                            "required": true,
                            "desc": "Короткое имя принтера для системы"
                        },
                        "name": {
                            "label":"Название",
                            "type": "text",
                            "required": true,
                            "desc": "Полное название принтера"
                        },
                        "description": {
                            "label":"Описание",
                            "type": "textarea",
                            "desc": "Дополнительная информация о принтере"
                        },
                        "active": {
                            "label":"Активен",
                            "type": "boolean"
                        },
                        "created_at": {
                            "label":"Создан",
                            "type": "date",
                            "readonly": true,
                            "table_only": true
                        },
                        "updated_at": {
                            "label":"Обновлен",
                            "type": "date",
                            "readonly": true,
                            "table_only": true
                        }
                    }
                }
            }
        }
    },

}
