# Instrucciones del proyecto

## Estructura y código
- El proyecto está dividido en `client/` y `server/`; realiza los cambios en el lado correspondiente.
- Usa TypeScript con los tipos estrictos existentes. Evita introducir `any` o desactivar comprobaciones de tipos.
- Escribe código claro, con nombres descriptivos y funciones pequeñas centradas en una responsabilidad.
- Reutiliza las abstracciones y patrones existentes; evita duplicación, complejidad innecesaria y dependencias nuevas sin necesidad.
- Valida los datos en los límites del sistema y gestiona los errores explícitamente; no ocultes fallos con valores por defecto engañosos.
- Mantén los cambios acotados a la solicitud y conserva el comportamiento existente que no esté relacionado.
- Añade comentarios solo cuando aclaren una decisión o comportamiento no obvio.

## Buenas prácticas de testing
- Toda funcionalidad nueva o modificada debe añadir o actualizar tests que verifiquen su comportamiento.
- Prioriza tests unitarios para lógica aislada; usa tests de integración o E2E cuando haya que comprobar interacciones entre componentes o el flujo en el navegador.
- Comprueba casos normales, límites y errores relevantes; usa mocks para aislar dependencias externas y datos deterministas.
- Mantén los tests independientes, repetibles y sin depender del orden de ejecución ni de servicios externos.
- No cambies tests para ocultar regresiones: ajusta las expectativas solo cuando el comportamiento intencionado cambie.

## Validación
- Para cambios en el cliente, ejecuta `npm run build` y `npm test` desde `client/`.
- Para cambios en el cliente que afecten al navegador, ejecuta también `npm run test:e2e` desde `client/`.
- Para cambios en el servidor, ejecuta `npm run build` y `npm test` desde `server/`.
