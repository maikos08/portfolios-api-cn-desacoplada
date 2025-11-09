## Portfolios API — Documentación técnica

**Autor:** Miguel Ángel Rodríguez Ruano

---

### Descripción

API REST para gestionar portfolios (CRUD).
Proyecto escrito en TypeScript/Node.js y preparado para ejecutarse como **Lambdas en contenedores (AWS Lambda Image)**.
Persistencia: **DynamoDB**.

---

### Contenido del documento

* Organización del repositorio y propósito de cada archivo/directorio
* Dependencias e instalación (desarrollo)
* Variables de entorno necesarias
* Arquitectura general y responsabilidades
* Guía profesional de despliegue a AWS (CloudFormation, ECR, Lambda image, API Gateway, DynamoDB)
* Verificación y pruebas locales
* Notas de seguridad y buenas prácticas

---

## Estructura del repositorio

Raíz del proyecto:

```
api/
├── package.json
├── package-lock.json
├── tsconfig.json
├── Dockerfile         # construcción de imagen preparada para AWS Lambda Image
├── api-lambdas.yml    # CloudFormation para Lambdas / API Gateway (stack principal)
├── api-ecr.yml        # CloudFormation para crear repositorio ECR
├── bdd.yml            # CloudFormation para crear tabla DynamoDB
├── src/
│   ├── app.ts           # Express app (se mantiene para compilación/local)
│   ├── server.ts        # bootstrap del servidor (neutralizado para despliegue serverless)
│   ├── handlers/        # handlers Lambda (entrypoints para AWS Lambda)
│   ├── types/           # DTOs / tipos auxiliares
│   ├── data/
│   └── config/          # configuración del environment
│       └── data-source.ts
└── public/              # assets estáticos
    └── index.html
```

---

## Por qué está organizado así

* `src/handlers`: contiene los entrypoints Lambda (exportan `handler`) y están preparados para que la imagen Lambda los ejecute (por ejemplo `dist/handlers/getAllPortfolios.handler`).
* `src/app.ts`: mantiene la app Express para permitir compilar tipos.
* `src/config`: centraliza variables de configuración y el cliente DynamoDB (reutilizado por los handlers).
* `api-ecr.yml`, `api-lambdas.yml`, `bdd.yml`: plantillas CloudFormation para crear (respectivamente) repositorio ECR, stack con Lambdas + API Gateway, y tabla DynamoDB.

---

## Dependencias e instalación (entorno de desarrollo)

### Requisitos mínimos locales

* Node.js
* npm
* Docker (para construir la imagen y testear localmente)
* AWS CLI configurado con credenciales y la región deseada

### Instalación y build

```cmd
cd <ruta-del-proyecto>
npm install
npm run build
```

**Scripts relevantes en `package.json`:**

* `npm run build` — compila TypeScript a `dist/`.
* `npm run dev` — arranca un watcher para desarrollo (usa `src/server.ts` en local).

---

## Variables de entorno

Crear un fichero `.env` en la raíz (no subirlo al repositorio).
Ejemplo:

```
NODE_ENV=development
PORT=8080
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=Portfolios
```

---

## Arquitectura (visión general)

Objetivo: contenerizar la aplicación y ejecutar handlers como funciones **AWS Lambda basadas en imagen**.
La aplicación está diseñada para que la lógica de negocio (controllers/handlers) sea reutilizable tanto en un servidor Express para desarrollo como en handlers Lambda para producción serverless.

### Componentes y responsabilidades

* **API Gateway (REST):** expositor público de la API. Gestiona rutas y seguridad (API Key / Usage Plans).
* **AWS Lambda (Image):** cada handler se empaqueta en la imagen; `ImageConfig.Command` en CloudFormation indica el módulo/handler a ejecutar (por ejemplo `dist/handlers/getAllPortfolios.handler`).
* **ECR:** repositorio de imagen donde se sube la imagen construida.
* **DynamoDB:** persistencia NoSQL para portfolios.

### Flujo de petición (alto nivel)

**Client → API Gateway → Lambda function (container image) → DynamoDB**

---

## Despliegue a AWS — Guía paso a paso

Los pasos siguientes están redactados de forma genérica y segura: reemplaza los *placeholders* por tus valores (AWS account id, region, nombres de stack).

---

### 1. Preparar CloudFormation para ECR

Despliega `api-ecr.yml` para crear el repositorio ECR.
Después del deploy, en la consola AWS (ECR > Repositories > <tu-repo>) verás los comandos para subir imágenes; incluyen la autenticación y el push.

---

### 2. Construir la imagen Docker localmente y empujarla al ECR

Reemplaza `<AWS_ACCOUNT_ID>`, `<AWS_REGION>`, `<ECR_REPO>` y `<LOCAL_IMAGE_NAME>` con tus valores.

```cmd
REM Autenticarse en ECR (devuelve token y hace login en docker)
aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com

REM Construir imagen (asegúrate de que 'dist' esté presente: npm run build)
docker build --platform linux/amd64 -t <LOCAL_IMAGE_NAME>:latest -f ./Dockerfile . --provenance=false

REM Etiquetar y enviar
docker tag <LOCAL_IMAGE_NAME>:latest <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/<ECR_REPO>:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/<ECR_REPO>:latest
```

> 💡 La consola ECR también te propone exactamente estos comandos tras crear el repositorio.

---

### 3. Desplegar la tabla DynamoDB

Despliega `bdd.yml` directamente desde CloudFormation.

---

### 4. Desplegar el stack principal (Lambdas + API Gateway)

Despliega `api-lambdas.yml` en CloudFormation.
Se solicita el parámetro:

* `ImageName` (por defecto: `portfolios-app-desacoplada`)

---

### 5. Obtener la URL pública de la API

Tras el deploy del stack principal, la salida (Outputs) del stack incluye la URL base de la API.
Puedes obtenerla con:

```cmd
aws cloudformation describe-stacks --stack-name <STACK_NAME_API> --region <AWS_REGION> --query "Stacks[0].Outputs[?OutputKey=='PortfolioApiUrl'].OutputValue" --output text
```

Ruta final de la colección de portfolios:
`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/portfolios`

---

### 6. Obtener el valor del API Key

También se encuentra en los *Outputs* el `ApiKeyId`.
Puedes obtenerlo con:

```cmd
ApiKeyId=$(aws cloudformation describe-stack-resources --stack-name <STACK_NAME_API> --region <AWS_REGION> --query "StackResources[?LogicalResourceId=='APIKey'].PhysicalResourceId" --output text)
```

Y luego obtener la clave:

```cmd
aws apigateway get-api-key --api-key ${ApiKeyId} --include-value --region <AWS_REGION> --query '{id:id, name:name, value:value}' --output json
```

---

### 7. Probar la aplicación

Abre `public/index.html` localmente y configura el cliente con:

* **API_URL:** `https://<api-host>/prod/portfolios`
* **API_KEY:** valor obtenido en el paso anterior

---

## Verificación y pruebas

* Comprobar que `dist/handlers/*.js` coincide con las rutas usadas en los `ImageConfig.Command` de `api-lambdas.yml`.
* Ejecutar `npm run build` y comprobar que no hay errores.
* Probar endpoints con `curl` o Postman:

  * `GET /portfolios`
  * `POST /portfolios`
