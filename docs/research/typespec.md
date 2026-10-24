# Исследование #22: TypeSpec — версии, генерация OpenAPI и TS-типов в npm workspaces

Дата: 2026-10-24. Окружение проверки: Node.js v24.19.0, npm 11.17.0, Windows 11.
Здесь собраны только факты и варианты. Где лежит контракт и потребляют ли backend/frontend сгенерированные типы, решается в отдельном тикете.

**Как проверено.** Версии взяты из npm registry (`npm view <pkg> version dist-tags engines peerDependencies time --json`), а не по памяти. Связки собраны и запущены в отдельном черновом npm workspace (`api` + `backend` + `frontend`, TypeScript `~6.0.3`, Fastify `^5.12.7`, как в репозитории). Строки с пометкой **[проверено]** воспроизведены руками; остальное взято из документации или исходников по ссылке.

---

## 1. Актуальные стабильные версии (npm `latest` на 2026-10-24)

### TypeSpec

| Пакет                                    | `latest`            | Дата релиза | `engines.node` | Заметки                                                                                                                                          |
| ---------------------------------------- | ------------------- | ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@typespec/compiler`                     | **1.17.0**          | 2026-10-08  | `>=22.0.0`     | CLI `tsp`. Линия 1.x с 1.0.0 (2025-05-06), минорные релизы примерно раз в месяц (1.14 07-14, 1.15 08-11, 1.16 09-09, 1.17 10-08)                 |
| `@typespec/http`                         | **1.17.0**          | 2026-10-08  | `>=22.0.0`     | peer: `@typespec/compiler ^1.17.0`, `@typespec/streams ^0.87.0` (optional)                                                                       |
| `@typespec/openapi`                      | **1.17.0**          | —           | `>=22.0.0`     | декораторы `@operationId`, `@extension`, `@info`                                                                                                 |
| `@typespec/openapi3`                     | **1.17.0**          | 2026-10-08  | `>=22.0.0`     | эмиттер OpenAPI. Обязательные peer: `compiler`, `http`, `openapi`. Optional peer: `versioning`, `json-schema`, `sse`, `events`, `streams`, `xml` |
| `@typespec/json-schema`                  | 1.17.0              | —           | `>=22.0.0`     | отдельный эмиттер JSON Schema                                                                                                                    |
| `@typespec/rest`, `@typespec/versioning` | 0.87.0              | —           | `>=22.0.0`     | всё ещё 0.x                                                                                                                                      |
| `@typespec/http-server-js`               | 0.58.0-**alpha**.29 | —           | —              | генератор серверного кода для JS, alpha                                                                                                          |
| `@typespec/http-client-js`               | 0.16.3              | —           | —              | генератор JS-клиента, 0.x                                                                                                                        |

Пакеты `compiler`/`http`/`openapi`/`openapi3`/`json-schema` выходят синхронно с одинаковой версией, их стоит обновлять вместе: peer-зависимости требуют `^1.17.0`. Канал `next` (`1.18.0-dev.*`) содержит dev-сборки.
Источники: https://www.npmjs.com/package/@typespec/compiler, https://www.npmjs.com/package/@typespec/openapi3, https://github.com/microsoft/typespec/releases

### Генераторы TS-типов и клиентов

| Пакет                 | `latest`   | Дата       | peer / engines                                            | Заметки                                                                             |
| --------------------- | ---------- | ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `openapi-typescript`  | **7.13.0** | 2026-02-11 | peer **`typescript: ^5.x`**                               | только типы (`.d.ts`), без рантайма                                                 |
| `openapi-fetch`       | **0.17.0** | 2026-02-11 | —                                                         | рантайм-клиент на `fetch` (~6 KB), типизируется через `paths` из openapi-typescript |
| `openapi-react-query` | 0.5.4      | 2026-02-11 | peer `@tanstack/react-query ^5.80`, `openapi-fetch ^0.17` | хуки TanStack Query. В репозитории TanStack Query пока нет                          |
| `@hey-api/openapi-ts` | **0.99.0** | 2026-06-22 | peer `typescript >=5.5.3 \|\| >=6.0.0`; node `>=22.18.0`  | типы + SDK + плагины (`zod`, `fastify` и др.), версия 0.x                           |
| `orval`               | 8.44.0     | 2026-10-21 | node `>=22.18.0`; peer только optional                    | клиенты (fetch/axios), хуки react-query/swr, zod, моки MSW                          |

### Fastify (backend: `fastify ^5.12.7`, latest 5.12.7)

| Пакет                                                            | `latest`       | Дата       | Роль                                                                                                                                            |
| ---------------------------------------------------------------- | -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `fastify-openapi-glue`                                           | **4.12.0**     | 2026-10-18 | contract-first: читает OpenAPI v2/v3.x, регистрирует маршруты со схемами валидации и связывает их с обработчиками по `operationId`. node `>=20` |
| `@fastify/swagger`                                               | 9.9.2          | 2026-10-09 | обычно code-first (OpenAPI строится из схем маршрутов); есть `mode: 'static'`, чтобы отдавать готовую спецификацию                              |
| `@fastify/swagger-ui` / `@scalar/fastify-api-reference`          | 6.1.2 / 1.76.0 | —          | UI для документации                                                                                                                             |
| `@fastify/type-provider-json-schema-to-ts` + `json-schema-to-ts` | 5.0.1 / 3.1.1  | —          | типы обработчиков из JSON Schema (схема должна быть литералом `as const`)                                                                       |
| `fastify-type-provider-zod`                                      | 7.0.0          | —          | peer `zod >=4.1.5`, `@fastify/swagger >=9.5.1`, `fastify ^5.5`                                                                                  |
| `zod`                                                            | 4.6.7          | —          | нужен для `zod`-плагина hey-api или orval                                                                                                       |

Источники: страницы пакетов на https://www.npmjs.com (`npm view`), https://github.com/seriousme/fastify-openapi-glue, https://github.com/fastify/fastify-swagger

---

## 2. Компиляция контракта в OpenAPI 3.0 / 3.1

### Эмиттер `@typespec/openapi3`: ключевые опции

Опции взяты из `tsp info @typespec/openapi3` (v1.17.0) и https://typespec.io/docs/emitters/openapi3/reference/emitter/:

- `openapi-versions`: `("3.0.0" | "3.1.0" | "3.2.0")[]`, **по умолчанию `["3.0.0"]`**. Можно указать сразу несколько версий. **[проверено]** При двух версиях файлы ложатся в `<output-dir>/3.0.0/openapi.json` и `<output-dir>/3.1.0/openapi.json`.
- `file-type`: `yaml` (по умолчанию) или `json`, можно массивом.
- `output-file`, `emitter-output-dir`; по умолчанию вывод идёт в `tsp-output/@typespec/openapi3/`.
- `seal-object-schemas` (по умолчанию `false`): закрывает объекты. В 3.0 добавляет `additionalProperties`, в 3.1 добавляет `unevaluatedProperties` (подводный камень с Fastify, см. §5).
- `operation-id-strategy`: `parent-container` (по умолчанию, даёт `EventTypes_create`), `fqn` или `explicit-only`.
- `omit-unreachable-types`, `new-line` (`lf` по умолчанию), `safeint-strategy`.

### Минимальный проект (проверен)

`tspconfig.yaml`:

```yaml
emit:
  - '@typespec/openapi3'
options:
  '@typespec/openapi3':
    emitter-output-dir: '{project-root}/dist'
    openapi-versions: [3.0.0, 3.1.0] # или одна версия
    file-type: json
```

`main.tsp` (фрагмент):

```tsp
import "@typespec/http";
import "@typespec/openapi";
using Http;

@service(#{ title: "Call Calendar API" })
@route("/api")
namespace CallCalendar;

model EventType {
  @visibility(Lifecycle.Read) id: string;
  @minLength(1) title: string;
  description?: string;
  @minValue(1) durationMinutes: int32;
}
@route("/event-types") namespace EventTypes {
  @get op list(): EventType[];
  @post op create(@body body: Create<EventType>): { @statusCode _: 201; @body body: EventType } | ApiError;
}
```

Команда: `tsp compile .`. **[проверено]** Компиляция примера заняла около 2 с, создала `dist/3.0.0/openapi.json` и `dist/3.1.0/openapi.json`. Параметры можно переопределить из CLI: `--option "@typespec/openapi3.seal-object-schemas=true"`.

### Разница между 3.0 и 3.1 на практике [проверено]

На нашем примере файлы отличаются только представлением nullable:

- 3.0: `"note": { "type": "string", "nullable": true }`
- 3.1: `"note": { "anyOf": [ {"type":"string"}, {"type":"null"} ] }`

В 3.1 схемы являются JSON Schema 2020-12, отсюда несовместимость с Ajv draft-07 в Fastify (§5). Есть и 3.2.0, но поддержка в инструментах вниз по цепочке не проверялась.

### Видимость (`@visibility`) и тела запросов: важный нюанс [проверено]

- Свойство с `@visibility(Lifecycle.Read)` при `@body body: EventType` попадает в схему как `readOnly: true`, **но остаётся в `required`**. Эмиттер переиспользует ту же схему `EventType` для запроса.
  - openapi-typescript без флагов генерирует `readonly id: string` как обязательное поле и в теле POST. **[проверено]** `tsc` выдал ошибку `Property 'id' is missing` на `api.POST("/api/event-types", { body: { title, ... } })`.
  - Ajv в Fastify не знает семантики `readOnly`. **[проверено]** POST без `id` вернул `400 body must have required property 'id'`.
- Решение на стороне TypeSpec: `@body body: Create<EventType>`. **[проверено]** Эмиттер создал отдельную схему `CreateEventType` без `id`, и валидация в Fastify заработала (201 для валидного тела, 400 для `kind: "fax"`, `durationMinutes: 0` и пропущенного обязательного поля).
- Решение на стороне клиента: `openapi-typescript --read-write-markers`, которое генерирует `$Read`/`$Write`. С ним openapi-fetch 0.17 исключает readOnly-поля из тела запроса. **[проверено]** `tsc` 6.0.3 проходит без ошибок.

---

## 3. TypeSpec-проект как пакет npm workspaces + цель в Makefile

### Как это устроено (проверено в черновом workspace)

```
package.json          "workspaces": ["api", "backend", "frontend"]   ← порядок важен
api/package.json      { "name": "api", "private": true, "type": "module",
                        "scripts": { "build": "tsp compile ." },
                        "devDependencies": { "@typespec/compiler": "^1.17.0",
                          "@typespec/http": "^1.17.0", "@typespec/openapi": "^1.17.0",
                          "@typespec/openapi3": "^1.17.0" } }
api/main.tsp, api/tspconfig.yaml
```

Установка в репозитории по правилам AGENTS.md: `npm install -D @typespec/compiler @typespec/http @typespec/openapi @typespec/openapi3 -w api`. Каталог (здесь `api`) приведён для примера: где лежит контракт, решит другой тикет. Шаблон проекта можно получить через `tsp init`.

Факты, важные для текущего `package.json` и Makefile:

1. **Порядок выполнения `--workspaces`.** **[проверено]** `npm run build --workspaces` запускает скрипты в порядке массива `workspaces`. Если генерация OpenAPI и типов должна идти до `frontend`/`backend` build, пакет контракта должен стоять в массиве первым. Иначе нужна явная цель в Makefile, которая выполняется до `build`.
2. **`npm test --workspaces` падает, если в пакете нет скрипта `test`.** **[проверено]** Получено `Missing script: "test"` для `api`, exit 1, а `make test`/`make check` вызывают именно эту команду. Варианты: добавить в `api` скрипт `test` (например, `tsp compile . --no-emit --warn-as-error` как проверку контракта) или использовать `--if-present` в корневых скриптах.
3. **Бинарники.** `tsp` и `openapi-typescript` поднимаются в корневой `node_modules/.bin` и доступны в `npm run` любого workspace и в `npm exec -w <pkg> -- tsp ...`.
4. Пример цели в стиле текущего Makefile (рецепты вызывают только npm):

   ```make
   api: ## скомпилировать TypeSpec в OpenAPI и сгенерировать типы
   	npm run build -w api
   ```

   Цель `check: lint test build` подхватит генерацию автоматически, если она встроена в `build` по порядку workspaces.

5. **Свежесть сгенерированного.** `openapi-typescript --check` проверяет, что сгенерированные типы актуальны (флаг из `--help` 7.13.0). Это удобно для CI, если сгенерированные файлы коммитятся.

### Что придётся поправить вокруг (факты о текущем репозитории)

- **Dockerfile** копирует перед `npm ci` только `backend/package.json` и `frontend/package.json`. **[проверено]** Если `package.json` нового workspace не скопирован, `npm ci` завершается успешно (exit 0), но **молча не ставит его зависимости**: `@typespec/*` не появляются. После `COPY . .` шаг `npm run build` упадёт, потому что не найдёт `tsp`. Нужна строка `COPY api/package.json api/` (имя каталога условное).
- **Prettier**: `.prettierignore` исключает только `dist`, `coverage` и `package-lock.json`, а `.prettierrc` задаёт `semi: false, singleQuote: true`. Сгенерированный `.d.ts` от openapi-typescript написан с `;` и 4 пробелами, вывод `tsp` по умолчанию лежит в `tsp-output/`. Без добавления в `.prettierignore` (или вывода в `dist`) `make lint` (`prettier --check .`) упадёт. oxlint игнорирует `**/dist/**`.
- Сгенерированный код содержит `any` (`$Write<any>` в `Readable<T>`), а AGENTS.md запрещает `any` в нашем коде. Это аргумент держать сгенерированное отдельно и исключать из линтеров.

---

## 4. Варианты: из OpenAPI в типы и клиент для frontend (Vite + React)

| Вариант                                       | Что даёт                                                        | Плюсы                                                                                           | Минусы и риски                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **A. `openapi-typescript` + `openapi-fetch`** | `.d.ts` (`paths`, `components`) + тонкий типизированный `fetch` | минимальный рантайм, нет кодогенерации функций; ложится на текущий паттерн `frontend/src/api/*` | **peer `typescript ^5.x` при нашем TS `~6.0.3`** (см. §6). Последний релиз 2026-02-11, issue про TS 6 открыт. Zod-схем нет |
| A+ `openapi-react-query`                      | хуки поверх A                                                   | —                                                                                               | требует `@tanstack/react-query` (в проекте нет)                                                                            |
| **B. `@hey-api/openapi-ts`**                  | `types.gen.ts`, SDK-клиент, плагины `zod`, `fastify` и др.      | официально поддерживает TS 6 (peer `>=6.0.0`); один инструмент для frontend и backend           | версия 0.x с частыми breaking changes; плагин `fastify` помечен **Beta** (https://heyapi.dev/openapi-ts/plugins/fastify)   |
| **C. `orval`**                                | клиенты fetch/axios, хуки react-query/swr, zod, моки MSW        | активно выпускается (8.44.0 от 2026-10-21)                                                      | тяжелее по конфигурации, ориентирован на react-query; не проверялся руками                                                 |
| **D. `@typespec/http-client-js`**             | JS-клиент напрямую из TypeSpec                                  | без промежуточного OpenAPI                                                                      | 0.16.x; не проверялся                                                                                                      |

**[проверено]** Для варианта A openapi-typescript 7.13.0 сгенерировал из 3.1-спеки корректные `components["schemas"]`: `note: string | null`, `kind: "video" | "phone"` (union литералов, как требует AGENTS.md), `/** Format: int32 */ durationMinutes: number`. Клиент на openapi-fetch проходит `tsc` 6.0.3 (с флагом `--read-write-markers` или со схемой `Create<T>`).

**[проверено]** hey-api 0.99.0 (`-p @hey-api/typescript fastify zod`) сгенерировал `types.gen.ts`, `zod.gen.ts` (zod 4: `z.int().gte(1).max(2147483647)` для `int32`, `z.iso.datetime()`, `.nullable()`) и `fastify.gen.ts` с `RouteHandlers` вида `RouteHandler<{ Body; Reply }>`. Имена обработчиков в camelCase (`eventTypesCreate`), а `operationId` в спеке `EventTypes_create`. Для связки с fastify-openapi-glue (которая ищет обработчик по точному `operationId`) понадобится `operationResolver` или `@operationId` в TypeSpec. Этот момент дальше не проверялся.

### Подводные камни openapi-fetch с текущими тестами frontend [проверено]

AGENTS.md предписывает в тестах подменять `fetch` через `vi.stubGlobal`. В исходнике `openapi-fetch/dist/index.mjs`, `createClient`, стоят `fetch: baseFetch = globalThis.fetch` и `Request = globalThis.Request`, то есть оба **захватываются при создании клиента**. Проверено в Vitest 5 + jsdom 30:

- клиент, созданный до `vi.stubGlobal("fetch", …)`, мок **не вызывает** и уходит в сеть (`fetch failed`);
- `baseUrl: ""` с относительным путём падает: `Failed to parse URL from /api/event-types`. В Vitest используется `Request` из Node/undici, а он, в отличие от браузерного, требует абсолютный URL. Отдельно проверено: `node -e 'new Request("/api/x")'` бросает ту же ошибку;
- рабочий вариант: `createClient<paths>({ baseUrl: globalThis.location.origin, fetch: (req) => globalThis.fetch(req) })`, то есть ленивое обращение к `fetch` плюс абсолютный base. Либо создавать клиент внутри функций модуля `api/`.

---

## 5. Варианты: схемы валидации для Fastify 5.12.7

Факт о Fastify. Ajv по умолчанию: Ajv 8, **JSON Schema draft-07**, strict mode, опции `{ coerceTypes: 'array', useDefaults: true, removeAdditional: true, allErrors: false }` (файл `@fastify/ajv-compiler/lib/default-ajv-options.js`, v4.0.7; https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

| Вариант                                                                     | Как                                                                                                                                                          | Плюсы                                                                                                                                             | Минусы                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. `fastify-openapi-glue`**                                               | `app.register(openapiGlue, { specification, serviceHandlers })`, обработчики по `operationId`                                                                | настоящий contract-first: маршруты, валидация body/params/query/response берутся из спеки; есть `prefix`, `operationResolver`, `securityHandlers` | маршруты регистрирует плагин, а не наши `routes/*.ts`, что расходится со слоем `routes/` из AGENTS.md (решать в отдельном тикете); `this` в обработчиках указывает на объект сервиса; типы обработчиков отдельно (через hey-api `fastify` или вручную через openapi-typescript)                                                          |
| **2. Схемы из OpenAPI (`components.schemas`) вручную в `schema: { body }`** | прочитать JSON, `app.addSchema` / подставить схему в маршрут; типы через openapi-typescript (`app.post<{ Body: components['schemas']['CreateEventType'] }>`) | сохраняет текущую структуру `routes/ → services/`                                                                                                 | ссылки `#/components/schemas/...` нужно переписать под `$id`/`$ref` Ajv; рантайм-схема и TS-тип получаются из разных генераторов                                                                                                                                                                                                         |
| **3. `@typespec/json-schema` эмиттер**                                      | `tsp compile --emit @typespec/json-schema` (опции `bundleId`, `emitAllModels`, `seal-object-schemas`)                                                        | схемы напрямую из TypeSpec                                                                                                                        | **[проверено]** выдаёт `"$schema": "https://json-schema.org/draft/2020-12/schema"`, и стандартный Fastify падает при старте: `no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`. Нужен Ajv2020. Кроме того, эмиттер **не учитывает видимость**: `id` в `required` без `readOnly`, `CreateEventType` не создаётся |
| **4. Zod** (hey-api/orval `zod` + `fastify-type-provider-zod` 7.0.0)        | валидация и типы из одного источника                                                                                                                         | единые типы с рантаймом                                                                                                                           | новые зависимости (`zod`, type provider); валидация уходит от Ajv; не проверялся с Fastify руками                                                                                                                                                                                                                                        |
| **5. `@fastify/type-provider-json-schema-to-ts`**                           | вывод типов из JSON Schema                                                                                                                                   | типы следуют из рантайм-схемы                                                                                                                     | схема должна быть TS-литералом `as const`: импорт `.json` не подходит, нужна генерация `.ts`                                                                                                                                                                                                                                             |
| `@typespec/http-server-js`                                                  | серверные заглушки из TypeSpec                                                                                                                               | —                                                                                                                                                 | alpha (0.58.0-alpha.29), рассчитан на Node `http`/Express-подобные, не на Fastify                                                                                                                                                                                                                                                        |

`@fastify/swagger` здесь не генератор схем: он строит OpenAPI из маршрутов. Для contract-first его можно использовать только чтобы отдавать готовую спеку (`mode: 'static'`, `specification: { path | document }`, см. README https://github.com/fastify/fastify-swagger) вместе с `@fastify/swagger-ui` или Scalar.

### Проверено с fastify-openapi-glue 4.12.0 на сгенерированных спеках

| Сценарий                                                         | OpenAPI 3.0.0                                                                                                                                                | OpenAPI 3.1.0                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `Booking`/`EventType` как тело POST (readOnly `id` в `required`) | 400 `must have required property 'id'`                                                                                                                       | то же                                                                                             |
| `Create<EventType>` + валидное тело                              | 201                                                                                                                                                          | 201                                                                                               |
| `kind: "fax"` / `durationMinutes: 0` / нет `note`                | 400 с понятным сообщением                                                                                                                                    | 400                                                                                               |
| **`note: null` (nullable)**                                      | `null` сохраняется                                                                                                                                           | **`null` превращается в `""`**: Ajv `coerceTypes` приводит null к первой ветке `anyOf` (`string`) |
| `seal-object-schemas: true`                                      | лишнее поле, например `id`, даёт 400 `body/id must NOT be valid` (эмиттер пишет `additionalProperties: {not:{}}`, поэтому `removeAdditional` не срабатывает) | **падение при старте**: `strict mode: unknown keyword: "unevaluatedProperties"`                   |

Вывод для 3.1: со стандартным Ajv в Fastify часть конструкций 2020-12 не работает или ведёт себя иначе. README fastify-openapi-glue прямо отсылает к `docs/schema2020.md` с рецептом `Ajv2020` через `fastify.setValidatorCompiler` (https://github.com/seriousme/fastify-openapi-glue/blob/master/docs/schema2020.md). Для 3.0 те же сценарии работают на дефолтном Ajv.

---

## 6. Подводные камни с Node.js 24 (и npm 11)

1. **Node 24 подходит всем инструментам по `engines`.** TypeSpec требует `>=22.0.0`, hey-api и orval `>=22.18.0`, `@redocly/cli` `>=22.12.0`, fastify-openapi-glue `>=20`. **[проверено]** `tsp` 1.17.0, openapi-typescript, hey-api, fastify-openapi-glue и Vitest 5 работают на v24.19.0. Специфичных для Node 24 поломок не найдено.
2. **npm 11 (идёт с Node 24) строго проверяет peer-зависимости.** **[проверено]** `openapi-typescript@7.13.0` + `typescript@~6.0.3` в одном workspace дают `ERESOLVE unable to resolve dependency tree … peer typescript@"^5.x"`. Так же упадёт `npm ci` в CI и в Docker. Обходы:
   - `overrides` в корневом `package.json`: `"overrides": { "openapi-typescript": { "typescript": "~6.0.3" } }`. **[проверено]** Установка проходит, генерация и `tsc` работают;
   - `--legacy-peer-deps` (глобально ослабляет проверку, хуже);
   - выбрать генератор с поддержкой TS 6 (hey-api).
     Upstream: issue «Add support for TypeScript 6» https://github.com/openapi-ts/openapi-typescript/issues/2723 открыт, фикс в PR #2774 (там же исправление `Readable<T>`/`Writable<T>` для `Date`). TypeScript `latest` в npm уже **7.0.2**, и есть отдельный issue «doesn't work with TypeScript 7» (#2841). Это важно на будущее, если проект обновит TS.
3. **Глобальный `Request` из Node (undici) не принимает относительные URL**, в отличие от браузерного. Это касается тестов openapi-fetch в Vitest/jsdom (§4).
4. **`npm audit`.** **[проверено]** `@typespec/openapi3` транзитивно тянет `@scalar/json-magic` → `undici` 7.x с advisories (dev-зависимость, `npm audit fix` есть). openapi-typescript тянет архивный `@redocly/openapi-core` 1.x → `js-yaml` 4.2.0 с GHSA-52cp-r559-cp3m (issue #2846). Влияет на CI, если там есть `npm audit --audit-level=high`.
5. **Windows, длинные пути.** Путь репозитория занимает примерно 140 символов (`…/node_modules/.bin/openapi-typescript.cmd` — 179). В черновике с путём 271 символ `.cmd`-шим не запустился (`MAX_PATH` = 260). В репозитории запас есть, но он небольшой.

---

## 7. Сводка компромиссов (без решения)

- **Версия OpenAPI.** 3.0 работает с дефолтным Ajv в Fastify без настройки и корректно обрабатывает `nullable`. 3.1 требует Ajv2020 (или отказа от `seal-object-schemas` и nullable-полей в теле), зато даёт настоящий JSON Schema 2020-12. Эмиттер умеет выдавать обе версии одновременно.
- **Тела запросов.** Независимо от версии нужны отдельные модели ввода (`Create<T>`/`Update<T>` в TypeSpec) или `--read-write-markers` на клиенте. Иначе readOnly-`id` ломает и TS-типы, и валидацию.
- **Frontend.** openapi-typescript + openapi-fetch проще всего по рантайму, но сейчас требуют `overrides` для TS 6 и не поддерживают TS 7. hey-api официально поддерживает TS 6, но остаётся на версии 0.x.
- **Backend.** fastify-openapi-glue — самый прямой contract-first путь, но маршруты регистрирует сам и обходит слой `routes/`. Ручная подстановка схем сохраняет архитектуру, но требует склейки `$ref`. `@typespec/json-schema` в чистом виде непригоден из-за 2020-12 и отсутствия видимости.
- **Инфраструктура при любом варианте**: новый workspace первым в `workspaces`, `test`-скрипт или `--if-present`, строка `COPY` в Dockerfile, `.prettierignore` для сгенерированного.

## Источники

- npm registry: `npm view` для всех пакетов выше; https://www.npmjs.com/package/@typespec/compiler, https://www.npmjs.com/package/@typespec/openapi3, https://www.npmjs.com/package/openapi-typescript, https://www.npmjs.com/package/openapi-fetch, https://www.npmjs.com/package/@hey-api/openapi-ts, https://www.npmjs.com/package/fastify-openapi-glue
- TypeSpec: эмиттер OpenAPI3 https://typespec.io/docs/emitters/openapi3/reference/emitter/ (и `tsp info @typespec/openapi3` v1.17.0); эмиттер JSON Schema https://typespec.io/docs/emitters/json-schema/reference/emitter/; релизы https://github.com/microsoft/typespec/releases
- openapi-typescript / openapi-fetch: https://openapi-ts.dev/ ; `openapi-typescript --help` (7.13.0); исходник `openapi-fetch/dist/index.mjs` (0.17.0); issues https://github.com/openapi-ts/openapi-typescript/issues/2723, /2841, /2846
- hey-api Fastify plugin (Beta): https://heyapi.dev/openapi-ts/plugins/fastify
- Fastify: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ ; `@fastify/ajv-compiler@4.0.7/lib/default-ajv-options.js`
- fastify-openapi-glue: https://github.com/seriousme/fastify-openapi-glue (README: `operationResolver`, strict mode, draft-07), https://github.com/seriousme/fastify-openapi-glue/blob/master/docs/schema2020.md
- @fastify/swagger (static mode): https://github.com/fastify/fastify-swagger
- npm workspaces / overrides: https://docs.npmjs.com/cli/v11/using-npm/workspaces , https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides
