# Lista de participantes

App de registro para la competencia (Cloudflare Pages + Workers KV).

- `/` → formulario público: cédula, nombre completo, teléfono, talla de camiseta (S, M, L, XL, 2XL).
- `/admin.html` → administración con clave: ver lista, resumen por talla, buscar, eliminar y **descargar CSV** (Excel).

## Estructura

```
public/               frontend estático
  index.html, app.js  formulario de registro
  admin.html, admin.js  panel de administración
  styles.css
functions/api/        API (Cloudflare Pages Functions)
  registrar.js        POST /api/registrar
  participantes.js    GET / DELETE /api/participantes (requiere clave)
  _util.js
```

## Despliegue en Cloudflare Pages (desde el panel web)

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → repo `Nancyms1012/lista-participantes`, rama `main`.
2. Configuración de build: Framework preset **None**, Build command **(vacío)**, Build output directory **`public`**.
3. Crear el KV: **Storage & Databases → KV → Create namespace** → nombre `participantes`.
4. En el proyecto Pages: **Settings → Bindings → Add → KV namespace**
   - Variable name: **`PARTICIPANTES`** (exacto, en mayúsculas)
   - KV namespace: `participantes`
5. En **Settings → Variables and Secrets** agregar (tipo *Secret*): **`ADMIN_PASSWORD`** = la clave que quieras para el panel admin.
6. Hacer un nuevo deploy (**Deployments → Retry deployment** o un push) para que tome los bindings.
7. Dominio: **Custom domains → Set up a custom domain** → `participantes.raceclubhub.com`.

## Notas

- La cédula es única: si ya está registrada, se muestra un aviso.
- El CSV usa `;` como separador y UTF-8 con BOM para abrir directo en Excel en español.
