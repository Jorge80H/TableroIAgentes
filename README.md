# Dashboard de Agentes IA - WhatsApp

Dashboard multi-tenant para gestionar conversaciones de WhatsApp con agentes IA y humanos.

## 🚀 Stack Tecnológico

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: InstantDB (real-time database)
- **Auth**: InstantDB Auth
- **Real-time**: InstantDB WebSocket
- **Deployment**: Netlify
- **Integration**: n8n para WhatsApp

## 📋 Prerequisitos

- Node.js 20+
- Cuenta de InstantDB
- Cuenta de Netlify (para deployment)
- Cuenta de n8n (para integración WhatsApp)

## ⚙️ Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Jorge80H/TableroIAgentes.git
cd TableroIAgentes
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Edita el archivo `.env` y configura:

```env
VITE_INSTANT_APP_ID=c089e2f5-a75d-427f-be1d-b059c6a0263d
PORT=5000
NODE_ENV=development
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

## 🗄️ Configuración de InstantDB

La aplicación ya está configurada con InstantDB (App: **DashboardIAGENTES**).

El esquema incluye:
- `organizations` - Organizaciones multi-tenant
- `agents` - Agentes IA con webhooks
- `conversations` - Conversaciones de WhatsApp
- `messages` - Mensajes (AI/HUMAN/CLIENT)
- `auditLogs` - Logs de auditoría

## 🌐 Deployment en Netlify

### Opción 1: Deployment automático via GitHub

1. Conecta tu repositorio de GitHub a Netlify
2. Configura las variables de entorno en Netlify:
   - `VITE_INSTANT_APP_ID`: `c089e2f5-a75d-427f-be1d-b059c6a0263d`
3. El build se ejecutará automáticamente

### Opción 2: Deployment manual

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login a Netlify
netlify login

# Inicializar el sitio
netlify init

# Deploy
netlify deploy --prod
```

## 🔧 Scripts Disponibles

```bash
npm run dev       # Desarrollo con hot reload
npm run build     # Build para producción
npm run start     # Ejecutar build de producción
npm run check     # Type checking con TypeScript
```

## 🔌 Integración con n8n

Para conectar con WhatsApp vía n8n:

1. Crea un workflow en n8n con un webhook
2. Configura el webhook para recibir mensajes de WhatsApp
3. En el dashboard, crea un agente con:
   - **Webhook URL**: La URL de tu webhook n8n
   - **API Token**: Token de seguridad para validar requests

### Flujo de mensajes:

**Cliente → WhatsApp → n8n → Dashboard:**
```
POST /api/webhooks/messages
{
  "agentId": "uuid",
  "clientPhone": "+1234567890",
  "clientName": "Cliente",
  "message": "Hola",
  "apiToken": "token"
}
```

**Dashboard → n8n → WhatsApp:**
El dashboard automáticamente envía mensajes humanos al webhook configurado.

## 📱 Características

- ✅ Multi-tenant (múltiples organizaciones)
- ✅ Autenticación con InstantDB
- ✅ Real-time updates via WebSocket
- ✅ Control AI/Humano de conversaciones
- ✅ Integración con n8n/WhatsApp
- ✅ Audit logs
- ✅ Dark mode
- ✅ Responsive design

## 🎨 Design System

Basado en Material Design + Slack/Linear patterns:
- Dark/Light mode
- Color coding: Verde (AI) / Azul (Humano)
- Layout de 3 columnas responsivo

Ver [design_guidelines.md](design_guidelines.md) para más detalles.

## 📖 Documentación

- Ver [CLAUDE.md](CLAUDE.md) para arquitectura y guías de desarrollo
- Ver [design_guidelines.md](design_guidelines.md) para sistema de diseño

## 🔐 Seguridad

- JWT tokens para autenticación
- Aislamiento multi-tenant por organizationId
- Validación de API tokens para webhooks
- Audit logs para trazabilidad

## 📄 Licencia

MIT
