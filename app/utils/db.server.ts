import { PrismaClient } from '@prisma/client';

let db: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

type Opts = {
  errorFormat: 'minimal' | 'pretty' | 'colorless';
  log: ('info' | 'query' | 'warn' | 'error')[];
};

const opts: Opts = {
  errorFormat: 'pretty',
  log: ['info', 'warn', 'error'],
};

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient(opts);
  db.$connect();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient(opts);
    global.__db.$connect();
  }
  db = global.__db;
}

export { db };
