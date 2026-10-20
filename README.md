# PROMPT MAESTRO — LISTA PLAZO FIJO V2.0 🇦🇷
## Sistema Personal de Gestión, Monitoreo y Seguimiento de Plazos Fijos

**Lista Plazo Fijo v2.0** es la evolución hacia una arquitectura profesional de 3 capas (Frontend React, Backend Node.js/Express, Base de Datos Persistente SQLite/PostgreSQL) para el seguimiento personal de inversiones a plazo fijo en Argentina.

---

## 🏛 Arquitectura Técnica v2.0

```
┌─────────────────────────────────────────────────────────┐
│              CAPA 1: Frontend (React 19 + Vite)        │
│    - Dashboard UI, Formularios, Filtros, Simulador     │
│    - Componentes responsivos Tailwind CSS               │
└───────────────────────────┬─────────────────────────────┘
                            │ API REST (/api/v1)
                            ▼
┌─────────────────────────────────────────────────────────┐
│         CAPA 2: Backend API (Express + TypeScript)       │
│    - Motor Financiero Centralizado (Fórmula 365 días)  │
│    - Control de Estados y Transacciones Atómicas       │
│    - Servicio de Auditoría e Importación/Exportación   │
└───────────────────────────┬─────────────────────────────┘
                            │ SQL FK & FK Constraints
                            ▼
┌─────────────────────────────────────────────────────────┐
│     CAPA 3: Persistencia Relacional (SQLite / Postgres) │
│    - SQLite por defecto (better-sqlite3)                │
│    - PostgreSQL para entornos distribuidos (pg)        │
│    - Tablas: plazos_fijos, eventos, entidades, audit...│
└───────────────────────────┘
```

---

## 🗄 Esquema de Base de Datos Relacional

1. **`entidades_financieras`**: Catálogo de bancos y entidades.
2. **`plazos_fijos`**: Registro de inversiones con precisión decimal (`capital`, `tna`, `tea`, `interes_estimado`, `monto_estimado`, `estado`, etc.).
3. **`eventos_plazo_fijo`**: Historial de auditoría y trazabilidad por inversión (Altas, Modificaciones, Renovaciones, Cobros).
4. **`auditoria_modificaciones`**: Registro detallado de operaciones financieras (valores anteriores vs nuevos).
5. **`registro_importaciones`**: Control de procesos de importación masiva de planillas.
6. **`configuraciones`**: Preferencias del usuario.

---

## 🐘 Creación e Invocación de Base de Datos PostgreSQL

Lista Plazo Fijo v2.0 ofrece soporte listo para PostgreSQL 16.

### Opción A: Levantar PostgreSQL mediante Docker Compose (Recomendado)

1. Iniciar los contenedores de PostgreSQL y Backend:
   ```bash
   docker-compose up -d
   ```
   Esto creará un contenedor de PostgreSQL 16 escuchando en el puerto `5432`, e inicializará automáticamente el esquema SQL (`server/db/schema.postgres.sql`).

2. Para verificar que el contenedor esté corriendo:
   ```bash
   docker ps
   ```

### Opción B: Iniciar PostgreSQL Localmente en la Computadora

1. **Crear la Base de Datos en PostgreSQL**:
   ```sql
   CREATE DATABASE plazofijodb;
   ```

2. **Ejecutar el Script de Esquema**:
   ```bash
   psql -U postgres -d plazofijodb -f server/db/schema.postgres.sql
   ```

3. **Configurar las Variables de Entorno en `.env`**:
   ```env
   DB_TYPE=postgres
   DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/plazofijodb
   ```

---

## 🌐 Especificación de API REST (`/api/v1`)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/deposits` | Obtiene listado completo de plazos fijos. |
| `POST` | `/api/v1/deposits` | Registra o actualiza un plazo fijo. |
| `POST` | `/api/v1/deposits/:id/confirm-collection` | Confirma el cobro de capital e intereses de manera atómica. |
| `POST` | `/api/v1/deposits/:id/renew` | Realiza la renovación vinculada transaccional. |
| `DELETE` | `/api/v1/deposits/:id` | Elimina un plazo fijo y sus eventos asociados. |
| `GET` | `/api/v1/events` | Obtiene el historial de eventos por inversión o general. |
| `POST` | `/api/v1/import` | Procesa importaciones masivas Excel/CSV. |
| `GET` | `/api/v1/backup` | Exporta un respaldo completo de la base de datos en JSON. |
| `POST` | `/api/v1/backup/restore` | Restaura la base de datos desde un respaldo JSON. |
| `POST` | `/api/v1/migrate-indexeddb` | Transfiere datos legados desde IndexedDB de manera transparente. |

---

## 🚀 Inicio Local (Entorno de Desarrollo)

### Requisitos
- Node.js v20+
- npm

### Pasos
1. Clonar el repositorio e instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor backend Express (Puerto 3001) y el frontend (Vite):
   ```bash
   # Terminal 1 - Backend Express API
   npx tsx server/index.ts

   # Terminal 2 - Frontend Development
   npm run dev
   ```
3. Abrir el navegador en `http://localhost:5173`.

---

## 🧪 Pruebas Automatizadas

Para ejecutar la suite completa de 25 pruebas unitarias e integrales en Vitest:
```bash
npx vitest run
```

---

## 🔄 Migración y Restauración de Respaldos JSON
La aplicación incluye soporte completo de verificación y restauración de archivos de respaldo JSON con identificadores UUID, tasas TNA/TEA, notas multi-línea, tipos UVA y tradicionales, e historial de eventos inmutables.
