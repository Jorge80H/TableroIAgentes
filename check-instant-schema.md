# Diagnóstico del Problema de Mensajes

## Problema Actual
- Solo se muestra 1 mensaje por conversación
- Los mensajes se guardan pero el query no los trae todos

## Verificación Necesaria

### 1. Verificar Links en InstantDB Dashboard

Ve a: https://www.instantdb.com/dash?s=main&t=home&app=c089e2f5-a75d-427f-be1d-b059c6a0263d

Verifica que existan estos links:

1. **conversations → messages** (one-to-many)
   - Forward label: `messages`
   - Reverse label: `conversation`

2. **agents → conversations** (one-to-many)
   - Forward label: `conversations`
   - Reverse label: `agent`

### 2. Comandos para Probar

```bash
# Verificar mensajes en la BD
node debug-messages.js

# Ver logs del servidor cuando llega un mensaje
# (Buscar "Creating message" y "Found existing conversation")
```

### 3. Posibles Causas

#### A) Link no configurado
Si el link `conversations → messages` no existe en InstantDB:
- Los mensajes se crean pero no se vinculan
- El query `conversations: { messages: {} }` no encuentra nada

#### B) Nombre del link incorrecto
Si usamos `db.tx.messages[messageId].link({ conversation: conversationId })`
pero el link se llama diferente en InstantDB, fallará silenciosamente.

#### C) Transacción parcialmente exitosa
Si parte de la transacción falla, el mensaje se crea pero el link no.

## Solución Recomendada

### Opción 1: Verificar y Corregir Links en Dashboard
1. Ir al dashboard de InstantDB
2. Verificar que exista el link conversations ↔ messages
3. Si no existe, crearlo:
   - Entity: conversations
   - Relation: has many messages
   - Label: messages
   - Reverse: conversation

### Opción 2: Usar ID directo (sin links)
Si InstantDB no está funcionando correctamente con links, podemos:
1. Guardar `conversationId` directamente en el mensaje
2. Filtrar mensajes por conversationId en el frontend

```typescript
// En el query
const { data } = db.useQuery({
  conversations: {},
  messages: {
    $: {
      where: {
        conversationId: selectedConversationId
      }
    }
  }
});
```

### Opción 3: Migrar a Relaciones Explícitas
Almacenar el `conversationId` como campo en messages y hacer queries separados.

## Siguiente Paso

Por favor verifica en el dashboard de InstantDB:
1. Que existe el link `conversations → messages`
2. Que el nombre del link es exactamente `messages` (forward) y `conversation` (reverse)
3. Comparte una captura de la sección de "Schema" o "Links"
