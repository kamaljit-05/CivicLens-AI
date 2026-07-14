# API Docs

`openapi.yaml` is the machine-readable API spec (OpenAPI 3.0). For a narrative
walkthrough of each flow, see `/docs/API.md` at the repo root instead.

## View it locally

```bash
npx @redocly/cli preview-docs openapi.yaml
# or
docker run -p 8080:8080 -e SWAGGER_JSON=/spec/openapi.yaml -v $(pwd):/spec swaggerapi/swagger-ui
```

## Validate after edits

```bash
npx @redocly/cli lint openapi.yaml
```
