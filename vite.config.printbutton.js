import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/components/PrintButton/index.js'),
      name: 'PVPrint',
      fileName: 'pvprint',
      formats: ['umd']  // UMD формат для совместимости
    },
    rollupOptions: {
      external: ['vue',  /^pvtables.*/],
      output: {
        globals: {
          vue: 'Vue',
          'pvtables/dist/pvtables': 'PVTables'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/pvprint.css'
          }
          return 'pvprint.[ext]'
        },
        entryFileNames: 'js/pvprint.js',
        chunkFileNames: 'js/[name].js'
      }
    },
    outDir: 'assets/components/pvprint/web/',
    emptyOutDir: false
  },
  plugins: [vue()]
})
