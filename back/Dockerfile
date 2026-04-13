FROM php:8.4-cli-bullseye

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    cron \
    gnupg \
    apt-transport-https \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Agregar repositorio de Microsoft
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list

# Instalar ODBC driver  
RUN apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18 unixodbc-dev && \
    rm -rf /var/lib/apt/lists/*

# Instalar extensiones PHP
RUN docker-php-ext-install pdo pdo_mysql pdo_odbc

# Instalar sqlsrv y pdo_sqlsrv
RUN apt-get update && apt-get install -y \
    autoconf \
    build-essential \
    && pecl install sqlsrv pdo_sqlsrv \
    && docker-php-ext-enable sqlsrv pdo_sqlsrv \
    && apt-get remove -y autoconf build-essential \
    && rm -rf /var/lib/apt/lists/*

# Crear carpeta de trabajo
WORKDIR /app

# Copiar el código de la aplicación
COPY . .

# Crear carpeta de logs
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Crear archivo de crontab
RUN echo "0 3 * * * cd /app && php scripts/sync_centros.php >> /app/logs/cron_sync.log 2>&1" > /etc/cron.d/sync-centros && \
    chmod 0644 /etc/cron.d/sync-centros && \
    crontab /etc/cron.d/sync-centros

# Ejecutar cron en foreground
CMD ["cron", "-f"]

