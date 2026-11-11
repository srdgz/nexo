# 8. Modo demo

## Objetivo

Que cualquier persona (recruiter, entrevistador) pueda recorrer NEXO completo **sin registrarse**, con datos ficticios realistas, y sin poner en riesgo el backend ni los datos de otros usuarios.

## Decisión

La demo funciona **en el navegador, sin backend**. Es un segundo conjunto de adaptadores de la arquitectura hexagonal:

```
features/<feature>/
├── domain/                     ← sin cambios
├── application/                ← sin cambios: casos de uso y stores
└── infrastructure/
    ├── supabase/               ← adaptadores reales
    └── demo/                   ← adaptadores en memoria con los mismos puertos
```

| Alternativa                         | Motivo de descarte                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuario demo compartido en Supabase | Cualquiera puede borrar o ensuciar los datos que ve el siguiente visitante; obliga a resetear con un cron; no funciona si el proyecto gratuito está pausado |
| Usuarios anónimos de Supabase       | Crea una fila en `auth.users` por visita, consume cuota y necesita limpieza                                                                                 |
| Capturas o vídeo                    | No demuestra que la aplicación funciona                                                                                                                     |

Ventajas: la demo es la mejor prueba de que los componentes no dependen de Supabase (los puertos se cumplen con dos implementaciones), arranca al instante y funciona aunque Supabase esté caído o pausado.

## Comportamiento

| Aspecto      | Comportamiento                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrada      | Botón «Explorar la demo» en login y registro, y ruta directa `/demo` (enlazable desde el README y el portfolio)                                            |
| Arranque     | `/demo` guarda `nexo.mode = demo` en `sessionStorage` y recarga en `/app/dashboard`; el arranque de la app elige los adaptadores según ese valor           |
| Sesión       | Usuaria ficticia «Laura Martín»; el `authGuard` acepta la sesión demo                                                                                      |
| Datos        | Semilla en `demo-seed.ts` con fechas **relativas a hoy**: siempre hay movimientos del mes actual, tareas que vencen hoy y eventos próximos                 |
| Escrituras   | Funcionan todas (crear, editar, completar, eliminar) y respetan las mismas validaciones del dominio                                                        |
| Persistencia | `sessionStorage`: sobrevive a recargar, se borra al cerrar la pestaña                                                                                      |
| Aviso        | Banda fija bajo el header: «Estás viendo una demo con datos ficticios. Los cambios se borran al cerrar la pestaña.» · «Restablecer datos» · «Crear cuenta» |
| Idioma       | Funciona igual; la semilla tiene nombres en ES y EN                                                                                                        |
| Limitaciones | En Perfil se desactivan cambiar email, cambiar contraseña y eliminar cuenta, con el motivo visible                                                         |
| Salida       | «Salir de la demo» (menú de usuario) borra el modo y los datos y vuelve a `/auth/login`                                                                    |
| Latencia     | Los adaptadores demo añaden 150–300 ms aleatorios para que se vean los estados de carga                                                                    |
| Bundle       | La semilla y los adaptadores demo se cargan con `import()` solo en modo demo; el cliente de Supabase solo en modo real                                     |

## Criterios de aceptación

- CA-D01 · Desde `/auth/login`, «Explorar la demo» lleva al dashboard con datos en menos de 1 s y sin peticiones a Supabase.
- CA-D02 · El dashboard demo muestra movimientos, presupuestos, tareas y eventos del mes en curso, sea cual sea la fecha.
- CA-D03 · Crear un gasto en la demo actualiza balance y presupuesto igual que en modo real.
- CA-D04 · Recargar mantiene los cambios; cerrar la pestaña y volver a `/demo` empieza con la semilla original.
- CA-D05 · La banda de demo está siempre visible y es accesible (`role="region"` con nombre).
- CA-D06 · Los mismos tests de casos de uso se ejecutan contra el adaptador demo y contra dobles de Supabase.
- CA-D07 · Un E2E de Playwright recorre la demo completa sin backend (sirve también como smoke test en CI).
