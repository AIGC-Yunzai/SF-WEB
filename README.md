# SF-WEB
##### SF-PLUGIN的WEB端，可用vercel一键部署
##### proxy/proxy.ts为ws反代，用于让服务器ip可以使用wss协议进行连接，可部署到deno，然后替换index.html里的proxyUrl（ws开头的那个域名），index.html里已内置，proxy/worker.js可以反代http域名，这个是部署到cf的worker的，也是替换index.html里的proxyUrl（hws开头的域名）


## 🔗 在线演示

访问 [https://sf.maliya.top](https://sf.maliya.top) 体验在线版本。

一键部署：[![Vercel Deployment](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AIGC-Yunzai/SF-WEB)

<img src="https://github.com/user-attachments/assets/41690a65-e15e-498b-8fe3-2cffd432c263" width="480" height="1080">

