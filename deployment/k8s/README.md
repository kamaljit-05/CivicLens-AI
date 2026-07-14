# Kubernetes manifests (starting point)

These are intentionally minimal — no Ingress/TLS, no autoscaling, no
StatefulSet for Postgres (use a managed database like RDS/Cloud SQL in
production instead of running Postgres in-cluster).

Before applying:
1. Push each service's image to your registry and update the `image:` fields.
2. Create the referenced secrets, e.g.:
   ```
   kubectl create secret generic civiclens-backend-secrets --from-env-file=../backend/.env
   kubectl create secret generic civiclens-ai-secrets --from-env-file=../ai-service/.env
   kubectl create secret generic civiclens-frontend-secrets --from-env-file=../frontend/.env
   ```
3. `kubectl apply -f .`
4. Add an Ingress (or your cloud's load balancer annotations) in front of the
   frontend Service for TLS termination and a real domain.
