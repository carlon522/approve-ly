const staticWorker = {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Static asset binding is unavailable.", {
        headers: { "content-type": "text/plain; charset=utf-8" },
        status: 500,
      });
    }

    const response = await env.ASSETS.fetch(request);

    if (response.status !== 404) {
      return response;
    }

    const url = new URL(request.url);
    const isFileRequest = url.pathname.split("/").pop()?.includes(".");

    if (isFileRequest) {
      return response;
    }

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};

export default staticWorker;
