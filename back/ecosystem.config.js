module.exports = {
  apps: [
    {
      name: 'proyecto-reservas-back',
      script: './index.js',
      // Modo watch: reinicia automáticamente cuando detecta cambios
      watch: [
        'index.js',
        'controllers',
        'routes',
        'middleware',
        'utils',
        'config'
      ],
      // Ignorar cambios en estos directorios
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.env',
        'package-lock.json'
      ],
      // Delay entre detección de cambios y reinicio (ms)
      watch_delay: 1000,
      // Variables de entorno
      env: {
        NODE_ENV: 'development'
      },
      // Instancias a ejecutar
      instances: 1,
      // Modo cluster (solo para producción con múltiples instancias)
      exec_mode: 'fork',
      // Puerto personalizado
      port: 4000,
      // Reintentos automáticos
      max_restarts: 10,
      min_uptime: '10s',
      // Logs
      output: './logs/out.log',
      error: './logs/error.log',
      log: './logs/combined.log',
      time: true,
      // Hacer que muestre más info
      autorestart: true,
      // Mensajes en consola
      merge_logs: true
    }
  ]
};
