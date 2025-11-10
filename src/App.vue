<template>
  <!-- Селектор модуля (показывается если модуль не задан) -->
  <div v-if="ModuleNotSeted" class="card flex justify-center">
    <Select 
      v-model="Module" 
      :options="Modules" 
      optionLabel="module" 
      placeholder="Выберите модуль" 
      class="w-full md:w-56" 
    />
  </div>
  
  <!-- Динамический компонент выбранного модуля -->
  <component 
    v-if="Module && Module.module && modules[Module.module]" 
    :is="modules[Module.module]"
  />
</template>

<script setup>
import { Select } from 'pvtables/dist/pvtables'
import { ref } from 'vue'
import { modules, modulesList } from './modules/index.js'

// Реактивные переменные
const Module = ref({ module: 'PrintSetting' })  // Модуль по умолчанию
const Modules = ref(modulesList)                // Список доступных модулей
const ModuleNotSeted = ref(false)               // Флаг отображения селектора

// Автоматическая конфигурация модуля
if (typeof pvprintConfigs !== 'undefined' && pvprintConfigs && pvprintConfigs.module) {
  if (modules[pvprintConfigs.module]) {
    Module.value = pvprintConfigs
    ModuleNotSeted.value = false
  }
}
</script>

<style>
#pvprint {
  display: flex;
  width: auto;
  height: 100vh;
}

.card {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}
</style>
