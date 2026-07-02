import { renderToReadableStream } from 'react-dom/server';
import { ServerRouter } from 'react-router';
import type { EntryContext } from 'react-router';
import { isbot } from 'isbot';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error) {
        responseStatusCode = 500;
        console.error(error);
      },
    },
  );
  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }
  responseHeaders.set('Content-Type', 'text/html');
  return new Response(body, { status: responseStatusCode, headers: responseHeaders });
}
