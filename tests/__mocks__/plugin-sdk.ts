type PluginInstance = {
  fetch: (request: Request) => Response | Promise<Response>;
};

function createMockPlugin(manifest: unknown): PluginInstance {
  return {
    fetch(request: Request) {
      if (new URL(request.url).pathname === "/manifest.json") {
        return Response.json(manifest);
      }

      return new Response("Not Found", { status: 404 });
    },
  };
}

export function createPlugin(...args: [unknown, unknown]): PluginInstance {
  const [, manifest] = args;
  return createMockPlugin(manifest);
}

export function createActionsPlugin(): PluginInstance {
  return createMockPlugin({});
}
