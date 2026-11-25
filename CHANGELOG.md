# Changelog

## 1.0.9 - 2026-11-24

### Nuevo

- Actualizador integrado con GitHub Releases, progreso, descarga diferencial y verificacion SHA-512.
- Filtros de acceso y estado, orden del catalogo y estados vacios.
- Diagnostico, registro persistente con rotacion y prueba automatizada de humo.
- Recuperacion automatica de la instalacion anterior si falla una actualizacion de instancia.
- Catalogo y noticias dinamicas desde un manifiesto central con cache y respaldo local.
- Validacion de contenido, panel administrativo local y workflow de comprobacion sin publicacion automatica.
- Verificacion SHA-256 y tamano esperado para los paquetes de cada proyecto.

### Mejorado

- Renderer aislado con `contextIsolation`, sandbox, CSP y un `preload` con canales permitidos.
- Sesiones y tokens cifrados mediante `safeStorage` de Windows, con migracion del formato anterior.
- Extraccion segura de ZIP/JAR con limites, bloqueo de rutas relativas, duplicados y enlaces simbolicos.
- Guardado atomico de configuracion, validacion de RAM, proyectos y enlaces externos.
- Dependencias, empaquetado NSIS, accesibilidad por teclado y diseño adaptable.
- Logs sin tokens y mensajes de descarga/actualizacion mas claros.
- Acceso privado por roles de Discord; las claves incluidas en fuentes publicas antiguas se ignoran.
- Correccion del error `EPIPE` al ejecutar la aplicacion empaquetada y consolidacion del diseño para evitar superposiciones.

### Compatibilidad

- Se conservan catalogo, instancias, skins, configuracion, cuentas e introducciones existentes.
- El manifiesto de actualizacion antiguo permanece solo como respaldo temporal.
