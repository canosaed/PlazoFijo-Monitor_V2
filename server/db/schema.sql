-- Esquema Relacional de Base de Datos para Lista Plazo Fijo v2.0

-- Tabla 1: Entidades Financieras
CREATE TABLE IF NOT EXISTS entidades_financieras (
    id TEXT PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    tipo TEXT DEFAULT 'BANCO', -- BANCO, FINANCIERA, BILLETERA, OTRO
    activo INTEGER DEFAULT 1, -- 1 = Activo, 0 = Inactivo
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Tabla 2: Plazos Fijos
CREATE TABLE IF NOT EXISTS plazos_fijos (
    id TEXT PRIMARY KEY,
    entidad_id TEXT,
    banco TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'TRADICIONAL_TF', -- TRADICIONAL_TF, UVA, PRECANCELABLE, OTRO
    capital NUMERIC NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'ARS',
    fecha_inicio TEXT NOT NULL, -- Format YYYY-MM-DD
    fecha_vencimiento TEXT NOT NULL, -- Format YYYY-MM-DD
    dias INTEGER NOT NULL,
    tna NUMERIC NOT NULL,
    tea NUMERIC,
    interes_estimado NUMERIC NOT NULL,
    interes_informado NUMERIC,
    interes_cobrado NUMERIC,
    monto_estimado NUMERIC NOT NULL,
    monto_informado NUMERIC,
    capital_recibido NUMERIC,
    renovacion_automatica INTEGER DEFAULT 0, -- 1 = Si, 0 = No
    estado TEXT NOT NULL DEFAULT 'VIGENTE', -- VIGENTE, PROXIMO_A_VENCER, VENCIDO_PENDIENTE, RENOVADO, CERRADO, CANCELADO
    id_plazo_anterior TEXT,
    id_plazo_siguiente TEXT,
    observaciones TEXT,
    is_demo INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (entidad_id) REFERENCES entidades_financieras(id) ON DELETE SET NULL,
    FOREIGN KEY (id_plazo_anterior) REFERENCES plazos_fijos(id) ON DELETE SET NULL,
    FOREIGN KEY (id_plazo_siguiente) REFERENCES plazos_fijos(id) ON DELETE SET NULL
);

-- Indices para optimizar consultas de plazos fijos
CREATE INDEX IF NOT EXISTS idx_plazos_fijos_banco ON plazos_fijos(banco);
CREATE INDEX IF NOT EXISTS idx_plazos_fijos_estado ON plazos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_plazos_fijos_fecha_venc ON plazos_fijos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_plazos_fijos_is_demo ON plazos_fijos(is_demo);

-- Tabla 3: Historial de Eventos por Plazo Fijo
CREATE TABLE IF NOT EXISTS eventos_plazo_fijo (
    id TEXT PRIMARY KEY,
    plazo_fijo_id TEXT NOT NULL,
    timestamp TEXT NOT NULL, -- ISO timestamp
    tipo_evento TEXT NOT NULL, -- ALTA, MODIFICACION, VENCIMIENTO, CONFIRMACION_COBRO, CONFIRMACION_CAPITAL, RENOVACION, CIERRE, CANCELACION
    descripcion TEXT NOT NULL,
    monto_capital NUMERIC,
    monto_interes NUMERIC,
    monto_total NUMERIC,
    metadata TEXT, -- JSON string
    FOREIGN KEY (plazo_fijo_id) REFERENCES plazos_fijos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eventos_plazo_fijo_id ON eventos_plazo_fijo(plazo_fijo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos_plazo_fijo(timestamp);

-- Tabla 4: Auditoría de Modificaciones Financieras
CREATE TABLE IF NOT EXISTS auditoria_modificaciones (
    id TEXT PRIMARY KEY,
    tabla_afectada TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    tipo_operacion TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    valores_anteriores TEXT, -- JSON string
    valores_nuevos TEXT, -- JSON string
    origen TEXT DEFAULT 'API_LOCAL',
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria_modificaciones(tabla_afectada, registro_id);

-- Tabla 5: Registro de Procesos de Importación Masiva
CREATE TABLE IF NOT EXISTS registro_importaciones (
    id TEXT PRIMARY KEY,
    nombre_archivo TEXT NOT NULL,
    fecha_importacion TEXT NOT NULL,
    filas_procesadas INTEGER DEFAULT 0,
    filas_importadas INTEGER DEFAULT 0,
    errores_count INTEGER DEFAULT 0,
    duplicados_count INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'COMPLETADO' -- COMPLETADO, ERROR, PARCIAL
);

-- Tabla 6: Configuraciones y Preferencias
CREATE TABLE IF NOT EXISTS configuraciones (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
