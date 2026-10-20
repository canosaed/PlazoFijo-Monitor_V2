-- Esquema Relacional de Base de Datos para Lista Plazo Fijo v2.0 (PostgreSQL)

-- Tabla 1: Entidades Financieras
CREATE TABLE IF NOT EXISTS entidades_financieras (
    id VARCHAR(64) PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(50) DEFAULT 'BANCO', -- BANCO, FINANCIERA, BILLETERA, OTRO
    activo INTEGER DEFAULT 1, -- 1 = Activo, 0 = Inactivo
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Plazos Fijos
CREATE TABLE IF NOT EXISTS plazos_fijos (
    id VARCHAR(64) PRIMARY KEY,
    entidad_id VARCHAR(64),
    banco VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL DEFAULT 'TRADICIONAL_TF', -- TRADICIONAL_TF, UVA, PRECANCELABLE, OTRO
    capital NUMERIC(18, 2) NOT NULL,
    moneda VARCHAR(10) NOT NULL DEFAULT 'ARS',
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    dias INTEGER NOT NULL,
    tna NUMERIC(8, 4) NOT NULL,
    tea NUMERIC(8, 4),
    interes_estimado NUMERIC(18, 2) NOT NULL,
    interes_informado NUMERIC(18, 2),
    interes_cobrado NUMERIC(18, 2),
    monto_estimado NUMERIC(18, 2) NOT NULL,
    monto_informado NUMERIC(18, 2),
    capital_recibido NUMERIC(18, 2),
    renovacion_automatica INTEGER DEFAULT 0, -- 1 = Si, 0 = No
    estado VARCHAR(50) NOT NULL DEFAULT 'VIGENTE', -- VIGENTE, PROXIMO_A_VENCER, VENCIDO_PENDIENTE, RENOVADO, CERRADO, CANCELADO
    id_plazo_anterior VARCHAR(64),
    id_plazo_siguiente VARCHAR(64),
    observaciones TEXT,
    is_demo INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entidad FOREIGN KEY (entidad_id) REFERENCES entidades_financieras(id) ON DELETE SET NULL,
    CONSTRAINT fk_plazo_anterior FOREIGN KEY (id_plazo_anterior) REFERENCES plazos_fijos(id) ON DELETE SET NULL,
    CONSTRAINT fk_plazo_siguiente FOREIGN KEY (id_plazo_siguiente) REFERENCES plazos_fijos(id) ON DELETE SET NULL
);

-- Indices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pg_plazos_fijos_banco ON plazos_fijos(banco);
CREATE INDEX IF NOT EXISTS idx_pg_plazos_fijos_estado ON plazos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_pg_plazos_fijos_fecha_venc ON plazos_fijos(fecha_vencimiento);

-- Tabla 3: Historial de Eventos
CREATE TABLE IF NOT EXISTS eventos_plazo_fijo (
    id VARCHAR(64) PRIMARY KEY,
    plazo_fijo_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_evento VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    monto_capital NUMERIC(18, 2),
    monto_interes NUMERIC(18, 2),
    monto_total NUMERIC(18, 2),
    metadata JSONB,
    CONSTRAINT fk_plazo_evento FOREIGN KEY (plazo_fijo_id) REFERENCES plazos_fijos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pg_eventos_plazo_fijo_id ON eventos_plazo_fijo(plazo_fijo_id);

-- Tabla 4: Auditoría de Modificaciones
CREATE TABLE IF NOT EXISTS auditoria_modificaciones (
    id VARCHAR(64) PRIMARY KEY,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id VARCHAR(64) NOT NULL,
    tipo_operacion VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    valores_anteriores JSONB,
    valores_nuevos JSONB,
    origen VARCHAR(100) DEFAULT 'API_LOCAL',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 5: Registro de Importaciones
CREATE TABLE IF NOT EXISTS registro_importaciones (
    id VARCHAR(64) PRIMARY KEY,
    nombre_archivo VARCHAR(255) NOT NULL,
    fecha_importacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filas_procesadas INTEGER DEFAULT 0,
    filas_importadas INTEGER DEFAULT 0,
    errores_count INTEGER DEFAULT 0,
    duplicados_count INTEGER DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'COMPLETADO'
);

-- Tabla 6: Configuraciones
CREATE TABLE IF NOT EXISTS configuraciones (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
