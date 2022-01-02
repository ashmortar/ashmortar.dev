import type { Player, PlayersInTriviaGames } from '@prisma/client';
import type { Session } from 'remix';
import { createCookieSessionStorage, redirect } from 'remix';
import bcrypt from 'bcrypt';
import { db } from './db.server';

type LoginForm = {
  username: string;
  password: string;
};

export async function login({ username, password }: LoginForm): Promise<Player | null> {
  const player = await db.player.findUnique({ where: { username } });
  if (!player) {
    return null;
  }
  const passwordsMatch = await bcrypt.compare(password, player.passwordHash);
  if (!passwordsMatch) {
    return null;
  }
  return player;
}

export async function register({ username, password }: LoginForm): Promise<Player> {
  const player = await db.player.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  return player;
}

// Session Management
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'TriviaSession',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export async function getPlayerSession(request: Request): Promise<Session> {
  return storage.getSession(request.headers.get('Cookie'));
}

export async function getPlayerId(request: Request): Promise<string | null> {
  const session = await getPlayerSession(request);
  const playerId = session.get('playerId');
  if (!playerId || typeof playerId !== 'string') {
    return null;
  }
  return playerId;
}

export async function getPlayer(request: Request): Promise<Player | null> {
  const playerId = await getPlayerId(request);
  if (!playerId) {
    return null;
  }

  try {
    const player = await db.player.findUnique({ where: { id: playerId } });
    return player;
  } catch (e) {
    console.error(e);
    throw logout(request);
  }
}

export async function requirePlayerId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<string> {
  const session = await getPlayerSession(request);
  const playerId = session.get('playerId');
  if (!playerId || typeof playerId !== 'string') {
    const searchPrams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchPrams}`);
  }
  return playerId;
}

export async function requirePlayer(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<Player> {
  const playerId = await requirePlayerId(request, redirectTo);
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) {
    const searchPrams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchPrams}`);
  }
  return player;
}

export async function requirePlayerOfGame(
  gameId: string,
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<PlayersInTriviaGames> {
  const player = await requirePlayer(request, redirectTo);
  const playerInGame = await db.playersInTriviaGames.findUnique({
    where: { playerId_triviaGameId: { playerId: player.id, triviaGameId: gameId } },
  });
  if (!playerInGame) {
    const searchPrams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchPrams}`);
  }
  return playerInGame;
}

export async function createPlayerSession(playerId: string, redirectTo: string) {
  const session = await storage.getSession(playerId);
  session.set('playerId', playerId);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await storage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await storage.getSession(request.headers.get('Cookie'));
  return redirect('/login', {
    headers: {
      'Set-Cookie': await storage.destroySession(session),
    },
  });
}
