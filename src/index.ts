import { getSandbox, type ExecOptions } from '@cloudflare/sandbox';

// Export the Sandbox class in your Worker
export { Sandbox } from "@cloudflare/sandbox";

interface ExecDto {
  command: string[],
  timeoutMs?: number;
  env?: Record<string, string>;
  workingDirectory?: string;
}

interface FileWriteDto {
  path: string,
  data: string,
  isBinary: boolean,
}

interface FileReadDto {
  path: string,
}

function shellEscape(arg: string): string {
  if (arg === "") return "''";
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get("id") ?? 'animated-parakeet';
      const sandbox = getSandbox(env.Sandbox, id);

      if (url.pathname === "/terminal" && request.method === "POST") {
        const body = await request.json<ExecDto>();
        const options = {
          cwd: body.workingDirectory,
          env: body.env,
          timeout: body.timeoutMs ?? 30_000,
          //signal: request.signal,
        } as ExecOptions

        const command = body.command
          .map(shellEscape)
          .join(" ");

        const result = await sandbox.exec(command, options);
        return Response.json(result);
      } else if (url.pathname === "/file/exists" && request.method === "POST") {
        const body = await request.json<FileReadDto>();
        const result = await sandbox.exists(body.path);
        return Response.json(result);
      } else if (url.pathname === "/file/read" && request.method === "POST") {
        const body = await request.json<FileReadDto>();
        const result = await sandbox.readFile(body.path);
        return Response.json(result);
      } else if (url.pathname === "/file/write" && request.method === "POST") {
        const body = await request.json<FileWriteDto>();
        const result = await sandbox.writeFile(body.path, body.data, { encoding: body.isBinary ? 'base64' : 'utf-8' });
        return Response.json(result);
      } else {
        return new Response(
          JSON.stringify({ error: 'Route dose not exist' }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify(error),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
