# PROMPT MAESTRO — LISTA PLAZO FIJO V2.0 🇦🇷
## Sistema Personal de Gestión, Monitoreo y Seguimiento de Plazos Fijos

**Lista Plazo Fijo v2.0** es la evolución hacia una arquitectura profesional de 3 capas (Frontend React, Backend Node.js/Express, Base de Datos Persistente SQLite/Relacional) para el seguimiento personal de inversiones a plazo fijo en Argentina.

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
│           CAPA 3: Persistencia Relacional (SQLite)      │
│    - Base de Datos Persistente Local (better-sqlite3)   │
│    - Tablas: plazos_fijos, eventos, entidades, audit...│
└─────────────────────────────────────────────────────────┘
```

---

## 🗄 Esquema de Base de Datos Relacional

1. **`entidades_financieras`**: Catálogo de bancos y entidades.
2. **`plazos_fijos`**: Registro de inversiones con precisión decimal (`capital`, `tna`, `interes_estimado`, `monto_estimado`, `estado`, etc.).
3. **`eventos_plazo_fijo`**: Historial de auditoría y trazabilidad por inversión (Altas, Modificaciones, Renovaciones, Cobros).
4. **`auditoria_modificaciones`**: Registro detallado de operaciones financieras (valores anteriores vs nuevos).
5. **`registro_importaciones`**: Control de procesos de importación masiva de planillas.
6. **`configuraciones`**: Preferencias del usuario.

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

## 🚀 Instrucciones de Inicio Local

### Requisitos
- Node.js v20+
- npm

### Pasos
1. Clonar el repositorio e instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor backend Express (Puerto 3001) y la aplicación frontend (Vite):
   ```bash
   # Terminal 1 - Backend Express API
   npx tsx server/index.ts

   # Terminal 2 - Frontend Development
   npm run dev
   ```
3. Abrir navegador en `http://localhost:5173`.

---

## 🐳 Inicio con Docker Compose

```bash
docker-compose up -d
```
El servicio estará disponible en `http://localhost:3001`.

---

## 🧪 Pruebas Automatizadas

Para ejecutar la suite completa de 24 pruebas unitarias e integrales en Vitest:
```bash
npx vitest run
```

---

## 🔄 Migración de Datos desde Versión 1.0 (IndexedDB)
La aplicación v2.0 detecta automáticamente si el navegador contiene una base de datos IndexedDB previa (`plazo_fijo_pro_db`) de la versión anterior. En la primera carga, envía los registros al endpoint `/api/v1/migrate-indexeddb` del backend, garantizando la preservación completa de sus inversiones e historial.
