/**
 * @typedef {Object} ErrorWithMessage
 * @property {string} message
 */

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isErrorWithMessage(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  );
}

/**
 * @param {unknown} maybeError
 * @returns {Error}
 */
function toErrorWithMessage(maybeError) {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    if (maybeError === undefined) {
      return new Error("Unknown error occurred");
    }
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError || "Unknown error occurred"));
  }
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  try {
    if (error === undefined) return "Unknown error occurred";
    if (error instanceof Error) return error.message;
    return JSON.stringify(error);
  } catch {
    return String(error || "Unknown error occurred");
  }
}

/**
 * 格式化 IPv6 地址
 * @param {string} url
 * @returns {string}
 */
function formatIPv6Url(url) {
  try {
    const parsedUrl = new URL(url);
    // 检查是否是IPv6地址
    if (parsedUrl.hostname.includes(':')) {
      // 如果主机名中包含:但没有被[]包围，则添加[]
      if (!parsedUrl.hostname.startsWith('[')) {
        parsedUrl.hostname = `[${parsedUrl.hostname}]`;
        return parsedUrl.toString();
      }
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:';
  } catch {
    return false;
  }
}

/**
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function handleWebSocket(req) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing target URL", { status: 400 });
  }

  if (!validateUrl(targetUrl)) {
    return new Response("Invalid WebSocket URL", { status: 400 });
  }

  try {
    // 创建 WebSocket 对
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // 连接到目标 WebSocket
    const targetWs = new WebSocket(targetUrl);

    // 等待连接建立
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      targetWs.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      targetWs.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // 接受连接
    server.accept();

    // 完全转发客户端消息
    server.addEventListener('message', event => {
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(event.data);
      }
    });

    // 完全转发服务器消息
    targetWs.addEventListener('message', event => {
      if (server.readyState === WebSocket.OPEN) {
        server.send(event.data);
      }
    });

    // 处理连接关闭
    server.addEventListener('close', () => {
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.close();
      }
    });

    targetWs.addEventListener('close', () => {
      if (server.readyState === WebSocket.OPEN) {
        server.close();
      }
    });

    // 简单错误处理
    server.addEventListener('error', () => {
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.close();
      }
    });

    targetWs.addEventListener('error', () => {
      if (server.readyState === WebSocket.OPEN) {
        server.close();
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });

  } catch (error) {
    return new Response(`Connection failed: ${getErrorMessage(error)}`, { 
      status: 502,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * @param {Request} req
 * @returns {Response}
 */
function handleHttp(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const status = {
    status: "running",
    name: "WebSocket Proxy Server (CF Worker)",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      websocket: "/proxy?url=ws://your-target-websocket-url",
    }
  };

  return new Response(JSON.stringify(status, null, 2), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}

// 统一的 CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

addEventListener('fetch', event => {
  try {
    const upgradeHeader = event.request.headers.get("upgrade") || "";
    if (upgradeHeader.toLowerCase() === "websocket") {
      event.respondWith(handleWebSocket(event.request));
      return;
    }
    
    event.respondWith(handleHttp(event.request));
  } catch (error) {
    console.error("Server error:", getErrorMessage(error));
    event.respondWith(
      new Response(`Server error: ${getErrorMessage(error)}`, { 
        status: 500,
        headers: new Headers(corsHeaders)
      })
    );
  }
}); 