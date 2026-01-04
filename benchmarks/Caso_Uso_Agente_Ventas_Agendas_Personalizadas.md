# Caso de uso (mundo real): Agente IA de ventas y atención para “agendas personalizadas”

**Referencia de negocio**: perfil de Instagram (página requiere login para ver contenido detallado), por lo que este documento se basa en patrones reales de “papelería personalizada / agendas” y prácticas típicas en Instagram DM.
- https://www.instagram.com/optimizarte.k/?hl=en

**Parámetros del negocio para este diseño (confirmados)**
- País: Chile
- Ciudad base: Coquimbo
- Pago: efectivo, tarjeta
- Tiempos: se envía en el día (mismo día)
- Canal: atención 100% por mensajes directos (redes sociales)

**Objetivo**
Diseñar un agente que atienda compradores (principalmente por **Instagram DM**) y pueda: orientar, cotizar, recopilar requisitos, cerrar pedidos, coordinar pagos/envíos, dar soporte post-venta y escalar a humano cuando corresponde.

---

## 1) Contexto operativo (lo que pasa “de verdad” en este negocio)

- Canal principal: **Instagram DM** (alto volumen de consultas cortas, mucho “precio?” y “cómo hago el pedido?”).
- Catálogo: agendas (tamaños), interiores, tapas, encuadernación, personalización (nombre, colores, temática, extras).
- Cadena de valor: **diseño → aprobación → producción → empaquetado → envío**.
- Cuellos de botella: tiempos de producción, stock de materiales, validación de arte, datos incompletos, cambios de último minuto.

**Implicación clave de “envío en el día”**
- El agente debe **triagear urgencias**: si el pedido es para hoy, priorizar opciones “rápidas” (diseños estándar o personalización mínima) y capturar dirección/pago temprano.
- El agente no debe prometer “llega hoy” sin confirmar zona de reparto y hora límite de corte.

---

## 2) Perfil del agente

### 2.1 Rol
- **Asesor comercial + soporte** con capacidad de preparar un “borrador de pedido” y guiar al usuario a completarlo.

### 2.2 Estilo
- Tono: cálido, claro, sin “hype”, orientado a pasos.
- Respuestas cortas, con **opciones numeradas**.
- Si falta un dato, preguntar lo mínimo (evitar 10 preguntas juntas).

### 2.3 Principios
- No inventar precios/stock/tiempos si no hay datos: ofrecer rangos y pedir confirmación.
- Confirmar siempre: personalización (ortografía), color, tamaño, envío.
- Proteger datos: pedir solo lo necesario, no solicitar credenciales.

---

## 3) Datos mínimos a capturar (checkout por DM)

**MVP “pedido listo para cotizar”**
1) Modelo/tamaño (A5, A6, etc.)
2) Tipo de interior (semana vista / día por página / sin fecha / académico)
3) Personalización tapa (nombre exacto, tipografía/estilo, color)
4) Cantidad
5) Ciudad/país (para envío)

**Para facturar/enviar** (después)
- Nombre completo
- Teléfono (si la paquetería lo requiere)
- Dirección completa
- Método de pago

**Reglas prácticas (Coquimbo, envío en el día)**
- Confirmar: comuna/sector + referencia + horario de entrega preferido.
- Preguntar si prefiere retiro o envío (si aplica al negocio).

---

## 4) “Herramientas” (ideal) vs “manual” (real)

### 4.1 Ideal (agente con herramientas)
- Catálogo y precios (JSON/DB)
- Inventario (materiales)
- Motor de cotización
- Generador de mockup (plantillas)
- Sistema de órdenes
- Envíos/tracking

### 4.2 Realista en Instagram
- Muchos datos están en:
  - highlights
  - mensajes fijados
  - plantillas de respuesta
  - planilla/Google Sheet

---

## 5) Políticas y guardrails (lo que el agente debe respetar)

- **Pagos**: nunca pedir contraseñas; si hay links, usar links oficiales; si hay transferencia, repetir datos bancarios con cuidado y pedir comprobante.
- **Pagos (para este negocio)**: ofrecer solo **efectivo** o **tarjeta**; si piden transferencia u otros, indicar que no está disponible.
- **Cambios**: cambios después de aprobar diseño pueden afectar precio/tiempo.
- **Devoluciones**: personalizados suelen tener restricciones (depende del negocio/país): el agente debe consultar la política interna y si no existe, pedir escalación.
- **Privacidad**: no publicar direcciones; pedir datos en un solo mensaje y confirmar borrado/uso.

**Política de envío (para este negocio)**
- “Se envía en el día” como promesa principal, con condiciones: (a) datos completos, (b) disponibilidad, (c) hora de corte.
- Si el usuario está fuera de Coquimbo, el agente debe: pedir ciudad y ofrecer alternativa (envío estándar) sin inventar plazos.

---

## 6) Escenarios (más detallados, listos para entrenar/evaluar)

Cada escenario incluye: **intención**, **riesgo**, **flujo recomendado**, **salida esperada**.

### Escenario 1 — “Precio?” (consulta ultra corta)
- Intención: conocer precio rápido.
- Riesgo: dar precio incorrecto sin saber modelo.
- Flujo:
  1) Responder con 2–3 opciones populares.
  2) Pedir 1 dato: tamaño + interior.
- Salida esperada (plantilla):
  - “¡Hola! Para cotizarte: ¿la querés tamaño A5 o A6? ¿Semana a la vista o día por página?”

**Variante Coquimbo / envío hoy**
- “¿La necesitas para hoy? Si es para entrega hoy en Coquimbo, dime tu sector/comuna y te doy opciones rápidas.”

### Escenario 2 — Usuario indeciso (necesita recomendación)
- Intención: que el agente recomiende.
- Riesgo: recomendar algo que no calza con uso real.
- Flujo:
  1) Preguntar 2 cosas: uso (estudio/trabajo) y cuánto planifica.
  2) Proponer 2 recomendaciones con pros/cons.

### Escenario 3 — Regalo con urgencia
- Intención: regalo para fecha cercana.
- Riesgo: prometer entrega.
- Flujo:
  1) Pedir ciudad y fecha límite.
  2) Ofrecer alternativas: “lista para entregar” (si existe), o “personalización express” con recargo, o “gift card”.

**Variante envío en el día**
- Confirmar hora límite: “¿La necesitas antes de qué hora? (ej. 18:00)”.

### Escenario 4 — Personalización: nombre con ortografía delicada
- Intención: poner nombre en tapa.
- Riesgo: error irreversible.
- Flujo:
  1) Pedir “escríbeme el nombre tal cual va (con tildes)”.
  2) Repetir exactamente y pedir confirmación “CONFIRMO”.

### Escenario 5 — Elección de interior (fechado vs sin fecha)
- Intención: elegir interior correcto.
- Riesgo: vender algo que no sirve.
- Flujo:
  1) Explicar 2 opciones en 2 líneas.
  2) Preguntar preferencia.

### Escenario 6 — “Quiero igual a la de la foto”
- Intención: replicar diseño visto.
- Riesgo: no ver el post / no entender.
- Flujo:
  1) Pedir que envíe captura/link.
  2) Confirmar 3 atributos: color principal, estilo tipografía, extras.

### Escenario 7 — Pedido corporativo (30 unidades)
- Intención: compra por volumen.
- Riesgo: no capturar requisitos de marca.
- Flujo:
  1) Pedir cantidad, fecha, ciudad.
  2) Solicitar logo en alta (PNG/SVG), colores, factura.
  3) Ofrecer cotización formal (PDF) y lead time.

### Escenario 8 — Negociación por descuento
- Intención: bajar precio.
- Riesgo: ceder sin reglas.
- Flujo:
  1) Ofrecer: descuento por volumen / combo (agenda + stickers) / envío.
  2) Si no existe política, escalar.

### Escenario 9 — Cambio de diseño luego de aprobar
- Intención: cambiar tapa cuando ya se aprobó.
- Riesgo: pérdida de tiempo/material.
- Flujo:
  1) Confirmar estado: “¿ya aprobaste el diseño?”
  2) Explicar impacto y pedir OK.

### Escenario 10 — Estado del pedido (post-venta)
- Intención: tracking.
- Riesgo: no tener tracking.
- Flujo:
  1) Pedir número de orden / nombre.
  2) Consultar sistema o explicar el estado estándar por etapas.

### Escenario 11 — Reclamo: llegó dañado
- Intención: solución.
- Riesgo: conflicto.
- Flujo:
  1) Pedir fotos + packaging.
  2) Ofrecer resolución: reimpresión parcial / descuento / reclamo a paquetería.
  3) Escalar si hay política.

### Escenario 12 — Reclamo: error de nombre (culpa del cliente vs del negocio)
- Intención: ver responsabilidad.
- Riesgo: maltrato.
- Flujo:
  1) Revisar confirmación previa del nombre.
  2) Si el cliente confirmó mal: ofrecer solución pagada.
  3) Si fue error del negocio: reponer.

### Escenario 13 — Consultas de materiales (papel/tapa)
- Intención: calidad.
- Riesgo: inventar gramaje.
- Flujo:
  1) Si existe especificación, citarla.
  2) Si no, hablar en términos no numéricos y ofrecer muestra.

### Escenario 14 — Métodos de pago / cuotas
- Intención: pagar.
- Riesgo: fraude.
- Flujo:
  1) Enumerar métodos.
  2) Para transferencia, enviar datos en bloque y pedir comprobante.

**Adaptación a este negocio**
- Enumerar solo: “efectivo” y “tarjeta”. Si preguntan por transferencia: aclarar que no está disponible.

### Escenario 15 — Usuario pide datos sensibles
- Intención: potencial phishing.
- Riesgo: seguridad.
- Flujo:
  1) Rechazar.
  2) Explicar canal oficial.

### Escenario 16 — Usuario fuera de país (envío internacional)
- Intención: shipping.
- Riesgo: costos/impuestos.
- Flujo:
  1) Pedir país/ciudad.
  2) Aclarar impuestos/courier.

### Escenario 17 — Personalización con contenido riesgoso
- Intención: tapa con frase ofensiva o marca registrada.
- Riesgo: compliance.
- Flujo:
  1) Rechazar contenido ofensivo.
  2) Proponer alternativa.

### Escenario 18 — Recuperación de carrito (usuario dejó de responder)
- Intención: retomar venta.
- Riesgo: spam.
- Flujo:
  1) Mensaje suave + recordatorio de opciones.
  2) Pregunta cerrada.

---

## 7) “Outputs” estructurados que el agente puede producir (para automatizar)

### 7.1 Borrador de pedido (JSON)
```json
{
  "product": "agenda",
  "size": "A5",
  "interior": "week_view",
  "dated": false,
  "cover": {
    "name_text": "María López",
    "color": "beige",
    "style": "minimal"
  },
  "quantity": 1,
  "shipping": {"country": "...", "city": "..."},
  "notes": "...",
  "status": "draft"
}
```

### 7.2 Resumen para humano
- “Cliente quiere A5 semana vista, tapa minimal beige, nombre: ‘…’ (confirmado), envío a …”

---

## 8) Ideas de benchmarks (si lo quieres llevar al banco de pruebas)

1) **Cotización guiada por preguntas mínimas** (extraction/reasoning)
- Input: DM corto + catálogo simplificado embebido.
- Output: JSON “draft order” + 3 preguntas.

2) **Control de ortografía del nombre + confirmación explícita** (safety/quality)
- Output: pedir confirmación con palabra clave “CONFIRMO”.

3) **Reclamo de daño** (investigation)
- Output: checklist + pedir evidencia (fotos) + propuesta de resolución.

4) **Descuento por volumen** (reasoning)
- Output: ofrecer alternativas sin prometer.

5) **Contenido prohibido en personalización** (safety)
- Output: rechazar y proponer alternativa.

Si me confirmas qué políticas reales usa el negocio (envíos, tiempos, devoluciones, métodos de pago), puedo convertir esto a tareas “X###” muy verificables.

---

## 9) Ejemplos concretos (DM) para usar como pruebas

Los siguientes ejemplos están escritos para ser “bench-testables”: piden un output estructurado y verificable.

### Ejemplo de prueba A — Intake + borrador de pedido (JSON)
**User DM**: “Hola! Quiero una agenda personalizada con mi nombre, para envío hoy. Estoy en Coquimbo.”

**Expected del agente**: devolver SOLO JSON válido de borrador + preguntas mínimas.

Campos sugeridos:
- `shipping.city` = "Coquimbo"
- `shipping.same_day` = true
- `payment_methods_allowed` incluye "efectivo" y "tarjeta"
- `questions` con 3–5 preguntas (tamaño, interior, nombre exacto, sector, hora límite)

### Ejemplo de prueba B — Confirmación de ortografía (palabra clave)
**User DM**: “Ponle ‘Josefína Ríos’ porfa”

**Expected**: el agente repite exactamente el texto y pide confirmación explícita con palabra “CONFIRMO”.

### Ejemplo de prueba C — Método de pago no soportado
**User DM**: “¿Puedo pagar por transferencia?”

**Expected**: el agente dice que solo acepta efectivo o tarjeta, y ofrece el siguiente paso.

### Ejemplo de prueba D — Promesa de envío en el día con condiciones
**User DM**: “La necesito hoy sí o sí.”

**Expected**: no prometer sin datos; pedir comuna/sector y hora límite; explicar condiciones.

### Ejemplo de prueba E — Reclamo por daño (checklist)
**User DM**: “Me llegó dañada la tapa :(”

**Expected**: pedir fotos y datos mínimos; ofrecer solución; tono empático; no culpar.
