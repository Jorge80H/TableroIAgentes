# Setup Checklist - Dashboard de Agentes IA

## ✅ Pasos Completados (por Claude Code)

- [x] Schema de TypeScript actualizado con `createdAt`
- [x] Componente ChatView mejorado para enviar mensajes a WhatsApp
- [x] Función Netlify para recibir mensajes de n8n (`n8n-webhook.ts`)
- [x] Función Netlify para enviar mensajes a WhatsApp (`send-message.ts`)
- [x] Configuración de Netlify redirects
- [x] Script de desarrollo arreglado para Windows
- [x] Cambios subidos a GitHub
- [x] Documentación actualizada

## 📋 Pasos que DEBES Completar

### 1. Configurar InstantDB Permissions (CRÍTICO)

**Sin esto, el dashboard NO funcionará**

1. Ve a https://instantdb.com/dash
2. Selecciona app "DashboardIAGENTES"
3. Click en "Permissions" (menú izquierdo)
4. Pega este JSON:

```json
{
  "organizations": {
    "allow": {
      "view": "auth.id != null",
      "create": "auth.id != null",
      "update": "false",
      "delete": "false"
    }
  },
  "agents": {
    "allow": {
      "view": "auth.id != null",
      "create": "auth.id != null",
      "update": "auth.id != null",
      "delete": "auth.id != null"
    }
  },
  "conversations": {
    "allow": {
      "view": "auth.id != null",
      "create": "true",
      "update": "auth.id != null || isWebhook",
      "delete": "false"
    },
    "bind": [
      "isWebhook", "data.id != null"
    ]
  },
  "messages": {
    "allow": {
      "view": "auth.id != null",
      "create": "true",
      "update": "false",
      "delete": "false"
    }
  },
  "auditLogs": {
    "allow": {
      "view": "auth.id != null",
      "create": "auth.id != null",
      "update": "false",
      "delete": "false"
    }
  }
}
```

5. Click **"Save"**

📖 **Guía detallada**: Ver [INSTANTDB_SETUP.md](INSTANTDB_SETUP.md)

---

### 2. Obtener Admin Token de InstantDB

1. En InstantDB dashboard → Settings → Tokens
2. Copia el **Admin Token**
3. Ve a Netlify Dashboard → Tu sitio → Site settings → Environment variables
4. Agrega:
   - **Name:** `INSTANT_ADMIN_TOKEN`
   - **Value:** `[pega el token aquí]`
5. Guarda y redeploy el sitio en Netlify

---

### 3. Copiar Agent ID del Dashboard

1. Ve a https://tableroiagentes.netlify.app
2. Login (usa Magic Code)
3. Ve a la página "Agents"
4. Encuentra el agente "Celubo Celuvendo"
5. **Copia el Agent ID** (es un UUID como `1e0accac-2e74-49c5-8008-7413e672e495`)

📝 **Guarda este ID** - lo necesitarás para n8n

---

### 4. Actualizar n8n - Nodo "Send to Dashboard"

Este nodo ya existe en tu flujo de n8n.

1. Abre tu workflow en n8n
2. Encuentra el nodo "Send to Dashboard"
3. En el JSON body, actualiza:
   - `"agentId"`: Pega el Agent ID que copiaste del dashboard
   - `"apiToken"`: Verifica que sea `c4b6ef6c60dc4e833cb8289bcc52ff03f07f816e079c327ee7971fe1051f93b4`

**Debe quedar así:**
```json
{
  "agentId": "1e0accac-2e74-49c5-8008-7413e672e495",
  "apiToken": "c4b6ef6c60dc4e833cb8289bcc52ff03f07f816e079c327ee7971fe1051f93b4",
  "clientPhone": "={{$json.messages[0].from}}",
  "clientName": "={{$json.contacts && $json.contacts[0] ? $json.contacts[0].profile.name : $json.messages[0].from}}",
  "message": "={{$json.messages[0].text.body}}",
  "senderType": "CLIENT"
}
```

---

### 5. Crear Nodo "Log AI Response" en n8n

**Este nodo es CRÍTICO - sin él, las respuestas de la IA NO aparecerán en el dashboard**

1. En n8n, agrega un nuevo nodo **HTTP Request**
2. Colócalo DESPUÉS del nodo que genera la respuesta de la IA
3. ANTES del nodo que envía el mensaje a WhatsApp
4. Configura:

**Settings:**
- Name: `Log AI Response`
- Method: `POST`
- URL: `https://tableroiagentes.netlify.app/api/webhooks/n8n/messages`
- Authentication: None
- Send Body: Yes
- Body Content Type: JSON

**Body (en modo JSON):**
```json
{
  "agentId": "1e0accac-2e74-49c5-8008-7413e672e495",
  "apiToken": "c4b6ef6c60dc4e833cb8289bcc52ff03f07f816e079c327ee7971fe1051f93b4",
  "clientPhone": "={{$node['WhatsApp Trigger'].json.messages[0].from}}",
  "clientName": "={{$node['WhatsApp Trigger'].json.contacts?.[0]?.profile?.name || $node['WhatsApp Trigger'].json.messages[0].from}}",
  "message": "={{$json.output}}",
  "senderType": "AI"
}
```

⚠️ **Importante:**
- Usa el MISMO Agent ID y API Token
- La expresión `={{$json.output}}` debe apuntar al campo que contiene la respuesta de tu IA
- Si tu IA devuelve la respuesta en otro campo (ej: `$json.response` o `$json.text`), ajústalo

5. Conecta: **AI Agent** → **Log AI Response** → **Send to WhatsApp**

---

### 6. Completar Webhook Receptor en n8n

Este webhook recibe mensajes DEL dashboard cuando un humano responde.

**Ya tienes el Webhook node configurado:**
- URL: `https://n8n.srv942208.hstgr.cloud/webhook/iagenteCeluvendo`

**Ahora agrega después del webhook:**

#### A. Function Node "Extract Data"

```javascript
// Extract data from dashboard webhook
const conversationId = $input.item.json.conversationId;
const clientPhone = $input.item.json.clientPhone;
const message = $input.item.json.message;
const senderType = $input.item.json.senderType;

return {
  json: {
    conversationId,
    clientPhone,
    message,
    senderType,
    to: clientPhone,
    text: {
      body: message
    }
  }
};
```

#### B. HTTP Request "Send to WhatsApp"

**Configura según tu proveedor de WhatsApp Business API:**

**Si usas WhatsApp Cloud API (Meta):**
```
Method: POST
URL: https://graph.facebook.com/v18.0/TU_PHONE_NUMBER_ID/messages
Headers:
  Authorization: Bearer TU_ACCESS_TOKEN
Body (JSON):
{
  "messaging_product": "whatsapp",
  "to": "={{$json.clientPhone}}",
  "type": "text",
  "text": {
    "body": "={{$json.message}}"
  }
}
```

📖 **Más opciones**: Ver [N8N_INTEGRATION.md](N8N_INTEGRATION.md) - Step 3

---

## 🧪 Pruebas

Una vez completados TODOS los pasos anteriores:

### Prueba 1: Mensajes entrantes (WhatsApp → Dashboard)
1. Envía un mensaje de WhatsApp a tu número
2. Verifica en n8n que el nodo "Send to Dashboard" se ejecutó con éxito
3. Ve al dashboard → Conversations
4. **Deberías ver** la conversación con el mensaje del cliente

### Prueba 2: Respuesta de IA (IA → Dashboard)
1. La IA debe responder automáticamente
2. Verifica en n8n que "Log AI Response" se ejecutó
3. En el dashboard, **deberías ver** la respuesta de la IA en la conversación

### Prueba 3: Control humano (Dashboard → WhatsApp)
1. En el dashboard, click "Take Control" en una conversación
2. Escribe un mensaje y envía
3. Verifica que el webhook receptor de n8n recibió el mensaje
4. **El mensaje debería llegar a WhatsApp**

---

## 🐛 Troubleshooting

### No veo mensajes en el dashboard

**Posibles causas:**
- ❌ Permissions no configuradas en InstantDB
- ❌ Agent ID incorrecto en n8n
- ❌ API Token no coincide

**Solución:**
1. Verifica permissions en InstantDB (Paso 1)
2. Verifica Agent ID copiado correctamente (Paso 3)
3. Verifica API Token es exactamente: `c4b6ef6c60dc4e833cb8289bcc52ff03f07f816e079c327ee7971fe1051f93b4`

### No veo respuestas de la IA

**Causa:** No creaste el nodo "Log AI Response"

**Solución:** Completa el Paso 5

### Mis respuestas no llegan a WhatsApp

**Causa:** Webhook receptor no configurado o URL incorrecta

**Solución:**
1. Verifica que el webhook URL en el agente del dashboard sea: `https://n8n.srv942208.hstgr.cloud/webhook/iagenteCeluvendo`
2. Completa el Paso 6
3. Verifica credenciales de WhatsApp Business API

---

## 📚 Documentación Adicional

- [N8N_INTEGRATION.md](N8N_INTEGRATION.md) - Guía completa de integración con n8n
- [INSTANTDB_SETUP.md](INSTANTDB_SETUP.md) - Configuración detallada de InstantDB
- [README.md](README.md) - Información general del proyecto

---

## ✅ Checklist Final

Marca cada paso cuando lo completes:

- [ ] 1. Configurar InstantDB Permissions
- [ ] 2. Obtener y configurar Admin Token en Netlify
- [ ] 3. Copiar Agent ID del dashboard
- [ ] 4. Actualizar nodo "Send to Dashboard" en n8n
- [ ] 5. Crear nodo "Log AI Response" en n8n
- [ ] 6. Completar webhook receptor en n8n
- [ ] 7. Probar mensaje entrante (WhatsApp → Dashboard)
- [ ] 8. Probar respuesta de IA (IA → Dashboard)
- [ ] 9. Probar control humano (Dashboard → WhatsApp)

**Cuando todos los pasos estén completos, el sistema estará 100% funcional.** 🎉
