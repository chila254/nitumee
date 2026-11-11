const path = require("node:path");

const port = Number(process.env.PGLITE_PORT ?? 55432);
const dataDir = path.join(__dirname, "..", ".pgdata");

(async () => {
  const pglite = await import("@electric-sql/pglite");
  const socket = await import("@electric-sql/pglite-socket");

  const db = await pglite.PGlite.create({ dataDir });
  const server = new socket.PGLiteSocketServer({ db, port, host: "127.0.0.1" });
  await server.start();
  console.log(`PGlite listening on 127.0.0.1:${port} (data: ${dataDir})`);

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await server.stop();
      await db.close();
      process.exit(0);
    });
  }
})();
