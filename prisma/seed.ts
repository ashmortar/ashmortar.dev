import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function seed() {
  await Promise.all(getPlayers().map((player) => db.player.create({ data: player })));
}

seed();

function getPlayers() {
  return [
    {
      username: 'testerman',
      passwordHash: '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u',
    },
  ];
}
