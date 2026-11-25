# Automatizacion de contenido

La fuente central es `content/launcher-content.json`. Reune catalogo, versiones, archivos verificables, acceso por rol y noticias. El launcher intenta leer la copia publicada en GitHub; si no esta disponible, usa el catalogo remoto anterior por compatibilidad, despues la ultima cache valida y por ultimo la copia incluida en la aplicacion.

## Flujo seguro

1. Edita el manifiesto con `npm run content:admin` o directamente en JSON.
2. Ejecuta `npm run content:validate`.
3. Para un modpack nuevo, calcula sus datos con `npm run content:hash -- "ruta-al-archivo"` y copia `size` y `sha256` al bloque `file`.
4. Revisa el cambio en Git. El workflow `Validate launcher content` solo valida: no publica releases ni modifica el repositorio.
5. La publicacion sigue siendo una accion manual del propietario. Al estar el manifiesto en la rama principal, el launcher lo leera sin exigir una nueva compilacion.

El panel administrativo escucha exclusivamente en `127.0.0.1`, genera un token aleatorio por sesion, valida antes de guardar y solo puede modificar el manifiesto dentro del repositorio. No usa cuentas, pagos, Supabase ni un servidor permanente.

## Noticias

Una noticia puede usar `draft`, `published` o `archived`. Solo se muestran las publicadas cuyo `publish_at` ya paso y cuyo `expires_at`, si existe, no ha vencido. `priority` ordena publicaciones y `featured` selecciona la principal. Las acciones aceptadas son `project`, `tab`, `versions` y `external` (HTTPS).

## Acceso privado

El manifiesto publico nunca debe contener `codigo_acceso`, `access_code` ni claves equivalentes. El validador rechaza esos campos y el launcher ignora las claves recibidas desde fuentes remotas antiguas. En 1.0.9 el acceso privado se basa en roles de Discord. Si en el futuro se requieren codigos privados, deben validarse en un servicio autenticado del lado servidor; no en JavaScript ni en un Gist publico.

## Limites deliberados

- No se ha creado ningun servidor en la PC del usuario.
- No se ha configurado Supabase porque el proyecto no contiene una integracion existente que reutilizar.
- No se publican releases, commits ni secretos automaticamente.
- Los archivos personales de Minecraft (`saves`, capturas y opciones ajenas al contenido administrado) no se eliminan durante una actualizacion.
