# MCP de links-referidos-api

Servidor MCP (Model Context Protocol) que envuelve `/admin/*` de la API (ver `01-solucion-final.md`) como herramientas que Claude Code puede usar desde **cualquier proyecto**, no solo este repo — es justo la pieza que faltaba para "gestionar esto conversacionalmente" en vez de armar requests a mano.

No tiene lógica propia: cada herramienta hace un fetch a la API real con tu JWT de sesión. No expone `/v1/*` (lectura pública para apps consumidoras) ni cambio de contraseña (fuera de alcance de "administrar productos/links").

## Qué necesita para funcionar

Las mismas credenciales que usás para entrar al dashboard — email + contraseña — porque `/admin/*` no acepta una read API key (esas son solo para `/v1/*`).

| Variable | Para qué | Default |
|---|---|---|
| `LINKS_REFERIDOS_EMAIL` | tu cuenta | — (obligatoria) |
| `LINKS_REFERIDOS_PASSWORD` | tu contraseña | — (obligatoria) |
| `LINKS_REFERIDOS_API_URL` | contra qué API hablar | `https://links-referidos-api.fly.dev` |

El servidor se loguea una vez al arrancar y cachea el JWT en memoria; si vence (30 días) o lo invalida un cambio de contraseña, se vuelve a loguear solo en el próximo llamado.

## Instalar en Claude Code (para usarlo desde cualquier proyecto)

1. Compilar una vez:
   ```
   npm run build --workspace=apps/mcp
   ```
2. Registrar el servidor (ajustá la ruta si moviste el repo):
   ```
   claude mcp add links-referidos \
     --env LINKS_REFERIDOS_EMAIL=tu-email \
     --env LINKS_REFERIDOS_PASSWORD=tu-contraseña \
     -- node C:/ruta/al/repo/apps/mcp/dist/index.js
   ```
3. Confirmar que aparece conectado con `claude mcp list` (o `/mcp` dentro de una sesión interactiva).

Una vez registrado, queda disponible en **cualquier proyecto** donde corras Claude Code en esta máquina — no hace falta repetir el registro por proyecto.

## Herramientas disponibles

Un mapeo casi 1:1 con los endpoints de `/admin/*`:

- **Productos**: `list_products`, `get_product`, `create_product`, `update_product`, `delete_product`
- **Slots**: `list_slots` (tablero global), `list_product_slots`, `create_slot`, `update_slot`, `delete_slot`
- **Validación**: `validate_slot`, `validate_product`, `validate_app`
- **Read API keys** (para que tus apps consuman `/v1/*`): `list_api_keys`, `create_api_key`, `revoke_api_key`
- **Imágenes de producto**: `list_product_images`, `add_product_image`, `delete_product_image`
- **Tipos de producto**: `list_product_types`, `create_product_type`, `delete_product_type`, `add_type_field`, `delete_type_field`
- **Valores de campo**: `get_field_values`, `save_field_values`

## Desarrollo local

```
npm run dev --workspace=apps/mcp
```

Corre con `tsx` directo sobre `src/index.ts`, sin compilar — para probar cambios antes de un `npm run build`.
