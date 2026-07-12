// Container HEALTHCHECK probe. Deliberately a plain Node script rather than
// curl/wget -- Node is already the runtime image's only guaranteed binary,
// so this avoids installing an extra OS package just for this one check.
// Hits /health/liveness (never /health/readiness): a container should not
// be killed/restarted just because a dependency is temporarily unreachable
// -- that's exactly what readiness (used by the load balancer / orchestrator
// to route traffic, not to decide whether to restart the container) is for.
import http from 'node:http';

const port = process.env.PORT ?? '3000';

const request = http.get({ host: '127.0.0.1', port, path: '/health/liveness', timeout: 2000 }, (response) => {
  process.exit(response.statusCode === 200 ? 0 : 1);
});

request.on('error', () => process.exit(1));
request.on('timeout', () => {
  request.destroy();
  process.exit(1);
});
