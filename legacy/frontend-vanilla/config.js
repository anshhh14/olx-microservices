// ── Point these at wherever your services are actually running ──────────
//
// Docker Compose defaults (see docker-compose.yaml):
const API = {
  users:    'http://localhost:3001/api/users',
  listings: 'http://localhost:3002/api/listings',
  chat:     'http://localhost:3003/api/chat',
};

// If you're running on Kubernetes instead (NodePort ports), comment the
// block above out and use this one instead:
//
// const API = {
//   users:    'http://localhost:30001/api/users',
//   listings: 'http://localhost:30002/api/listings',
//   chat:     'http://localhost:30003/api/chat',
// };
