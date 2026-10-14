/**
 * 搭个调调 · 页面服务
 *
 * 零依赖静态页面服务：把 pages/ 目录下的 HTML 页面发布为可访问的 URL。
 * 默认文档为 pages/user-agreement.html，即访问 / 时返回《搭个调调用户服务协议》。
 *
 * 环境变量：
 *   PORT  监听端口，默认 3000
 *   HOST  监听地址，默认 0.0.0.0（容器/云主机上可直接对外提供服务）
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

const HOST: string = process.env.HOST ?? '0.0.0.0';
const PORT: number = Number(process.env.PORT ?? 3000);
const DEFAULT_DOCUMENT = 'user-agreement.html';

// dist/server.js 的上一级即项目根目录，无论从哪个工作目录启动进程都能定位到 pages/
const PAGES_DIR: string = path.resolve(__dirname, '..', 'pages');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function send(res: ServerResponse, status: number, body: string, contentType = 'text/plain; charset=utf-8'): void {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  res.end(body);
}

/** 把 URL 路径解析为 pages/ 下的绝对路径；解析失败或越出 pages/ 时返回 null。 */
function resolvePagePath(urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const relative = decoded === '/' || decoded === '' ? DEFAULT_DOCUMENT : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(PAGES_DIR, relative);
  const withinPages = filePath === PAGES_DIR || filePath.startsWith(PAGES_DIR + path.sep);
  return withinPages ? filePath : null;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const startedAt = Date.now();
  const method = req.method ?? 'GET';
  const urlPath = (req.url ?? '/').split('?')[0].split('#')[0];

  const finish = (status: number): void => {
    console.log(`${method} ${urlPath} ${status} ${Date.now() - startedAt}ms`);
  };

  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    send(res, 405, 'Method Not Allowed');
    finish(405);
    return;
  }

  if (urlPath === '/healthz') {
    send(res, 200, JSON.stringify({ ok: true, defaultDocument: DEFAULT_DOCUMENT }), 'application/json; charset=utf-8');
    finish(200);
    return;
  }

  const filePath = resolvePagePath(urlPath);
  if (filePath === null) {
    send(res, 400, 'Bad Request');
    finish(400);
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error('not a regular file');
    }
    const body = await fs.readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.byteLength,
      'Cache-Control': 'no-cache',
    });
    res.end(method === 'HEAD' ? undefined : body);
    finish(200);
  } catch {
    send(res, 404, 'Not Found');
    finish(404);
  }
}

const server = createServer((req, res) => {
  void handleRequest(req, res).catch(() => {
    if (res.headersSent) {
      res.end();
    } else {
      send(res, 500, 'Internal Server Error');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`页面服务已启动：http://${HOST}:${PORT}/（默认文档 ${DEFAULT_DOCUMENT}，页面目录 ${PAGES_DIR}）`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
