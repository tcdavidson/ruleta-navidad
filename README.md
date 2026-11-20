# Ruleta de Navidad de David y Nerea

## Publicar gratis con GitHub Pages

1. Entra en https://github.com e inicia sesión.
2. Pulsa **New** para crear un repositorio.
3. Ponle el nombre `ruleta-navidad`.
4. Selecciona **Public** y pulsa **Create repository**.
5. En el repositorio, pulsa **Add file → Upload files**.
6. Descomprime este ZIP en tu ordenador y arrastra los tres archivos (`index.html`, `style.css`, `app.js`) a la página de GitHub. También puedes subir `README.md`.
7. Pulsa **Commit changes**.
8. En el repositorio, entra en **Settings → Pages**.
9. En **Build and deployment**, selecciona **Deploy from a branch**.
10. En Branch selecciona **main** y carpeta **/(root)**. Pulsa **Save**.
11. Espera un minuto y vuelve a Settings → Pages. GitHub mostrará tu dirección, normalmente:
   `https://TU-USUARIO.github.io/ruleta-navidad/`

## Importante
- La web necesita conexión a Internet para cargar Three.js desde jsDelivr y las fuentes de Google.
- El progreso se guarda en el navegador/dispositivo con localStorage. Si se abre en otro móvil u ordenador, tendrá un progreso separado.
- El modo de prueba no consume la casilla ni cuenta como tirada real.
- En Configuración, guardar nuevas cantidades reinicia el progreso con esas cantidades.
- No introduzcas información privada: la web es pública si el repositorio es público.

## Personalización
El texto de bienvenida y los colores están en `index.html` y `style.css`. La lógica de la ruleta está en `app.js`.
