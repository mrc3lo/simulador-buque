# Laboratorio Logística Marítima y Portuaria

Aplicación educativa en React/Next.js para experimentar con flotabilidad, estabilidad y distribución de carga. El profesor crea una sala, comparte un código y los alumnos ingresan con su nombre desde cualquier dispositivo.

## Qué incluye

- Vista independiente para profesor y alumnos.
- Cantidad variable de estudiantes, sin el límite original de cinco.
- Sala identificada por código de seis caracteres.
- PIN para recuperar el control docente desde otro computador.
- Carga por babor o estribor, con masa y posición longitudinal configurables.
- Cálculo de desplazamiento, calado, KG, KB, BM, KM, GM, momento escorante y escora.
- Visualización 3D interactiva con p5.js.
- Lista de participantes activos y bitácora de acciones.
- Sesión, preferencias y último estado guardados en `localStorage`.
- Estado compartido almacenado en Supabase.

## Arquitectura

- **Next.js + React + TypeScript:** interfaz y rutas privadas del servidor.
- **Supabase Postgres:** salas, participantes, cargas y bitácora.
- **Vercel:** alojamiento de la aplicación y ejecución de las rutas API.
- **p5.js 1.11:** visualización 3D del buque, instalada desde npm para mantener compatibilidad entre navegadores.

El navegador nunca recibe la `service_role` de Supabase. Todas las escrituras pasan por rutas del servidor que validan la sala, el rol y el token del participante.

## 1. Preparar Supabase

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. Abre **SQL Editor**.
3. Copia y ejecuta el contenido de `supabase/schema.sql`.
4. En **Project Settings > API**, copia:
   - Project URL.
   - `service_role` key. Esta clave es secreta y nunca debe subirse a GitHub.

## 2. Configurar el proyecto local

Requiere Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completa `.env.local`:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
APP_SECRET=una-frase-larga-aleatoria-y-privada
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Abre [http://localhost:3000](http://localhost:3000).

## 3. Publicar en GitHub

```bash
git init
git add .
git commit -m "Primera versión del simulador colaborativo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/simulador-buque.git
git push -u origin main
```

El archivo `.gitignore` evita que `.env.local` y las claves secretas se suban al repositorio.

## 4. Publicar en Vercel

1. Entra a [Vercel](https://vercel.com/) y selecciona **Add New > Project**.
2. Importa el repositorio de GitHub.
3. Vercel detectará Next.js automáticamente.
4. Agrega las variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET` y `NEXT_PUBLIC_APP_URL`.
5. En `NEXT_PUBLIC_APP_URL`, usa la dirección definitiva entregada por Vercel.
6. Presiona **Deploy**.

## Uso en clases

1. El profesor entra a `/profesor`, inicia sesión con su cuenta habilitada, crea una sala y guarda su PIN.
2. Comparte el enlace o el código visible en pantalla.
3. Cada estudiante entra a `/alumno`, escribe su nombre y se conecta.
4. El curso agrega cargas y observa cómo cambian los parámetros navales.
5. El profesor puede retirar la última carga, reiniciar el ejercicio o cerrar la sala.

## Consideración física

El modelo conserva las simplificaciones del prototipo: casco prismático rectangular, densidad constante de agua de mar de 1025 kg/m³ y posiciones discretas de carga. Es una herramienta didáctica; no sustituye software de cálculo o certificación naval.

## Acceso de profesores

El profesor inicia sesión con correo y contraseña antes de crear o recuperar una
clase. Los alumnos siguen entrando con nombre y código, sin crear una cuenta.
No existe registro público de profesores. La autorización se comprueba en el
servidor consultando Supabase Auth y exigiendo `app_metadata.role` igual a `"teacher"` o `"admin"`.
La sesión se guarda en una cookie HttpOnly y caduca según el token de Supabase;
al caducar, el profesor vuelve a iniciar sesión. El PIN de sala sigue siendo
necesario para recuperar una clase desde otro equipo.

### Actualizar una instalación existente (antes de desplegar)

Ejecuta en Supabase > SQL Editor:

```sql
alter table public.rooms
  add column if not exists teacher_user_id uuid references auth.users(id);
```

1. En Supabase > Authentication > Users, crea la cuenta del profesor con correo
   y contraseña (correo confirmado). Entrega la contraseña por un canal privado.
2. Habilita su rol con esta consulta, sustituyendo el correo:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"teacher"}'::jsonb
where email = 'profesor@tu-institucion.cl';
```

3. Verifica que la consulta haya afectado la cuenta correcta. Solo las cuentas
   con este rol podrán crear clases, aunque otras personas se registren en Auth.
4. Publica en Vercel usando las variables de entorno existentes. No necesitas
   agregar claves públicas ni exponer `SUPABASE_SERVICE_ROLE_KEY` al navegador.

Las clases nuevas quedan asociadas a la cuenta que las creó. Para asociar una
clase anterior a un profesor, ejecuta (sustituye correo y código):

```sql
update public.rooms
set teacher_user_id = (select id from auth.users where email = 'profesor@tu-institucion.cl')
where code = 'ABC234';
```

Las salas anteriores sin propietario requieren una cuenta docente habilitada y
su PIN para recuperarlas. El administrador gestiona altas, recuperación de
contraseñas y revocación del rol docente en Supabase.

Referencia: [Supabase Auth](https://supabase.com/docs/guides/auth).

## Verificación

`npm run lint` revisa el código y `npm test` ejecuta las pruebas físicas.
Para probar el login y los permisos contra un Supabase simulado, ejecuta
`npm run build` y luego `npm run test:auth`. Estas pruebas no usan cuentas reales.

## Administradores

Las cuentas con `app_metadata.role = "admin"` pueden iniciar sesión en `/profesor`,
crear clases y usar **Administración → Registrar profesor**. El formulario crea
cuentas docentes con correo confirmado y contraseña, sin enviar correos automáticos.
El administrador entrega las credenciales al profesor por un canal privado.
El servidor siempre asigna el rol `teacher` desde este formulario: no permite
crear administradores ni cambiar cuentas existentes. Los profesores y alumnos
no pueden acceder a esta operación. Los administradores también respetan la
propiedad de las salas; este rol no concede acceso al panel de Supabase.

El alta inicial de administradores se realiza mediante Supabase Auth Admin API,
con credenciales del servidor y `app_metadata.role = "admin"`. Las contraseñas y
claves nunca deben guardarse en código, migraciones ni documentación.
