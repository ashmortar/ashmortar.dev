import type { PlayersInTriviaGames } from '@prisma/client';
import { Form, Link, useLoaderData, useCatch, json, redirect, useParams } from 'remix';
import type { LoaderFunction, ActionFunction, LinksFunction } from 'remix';
import { db } from '~/utils/db.server';
import { getPlayer, requirePlayer } from '~/utils/session.server';
import { addSeconds } from 'date-fns';
import { usePolling } from '~/hooks';
import styles from '~/styles/lobby.css';

export const links: LinksFunction = () => [{ href: styles, rel: 'stylesheet' }];

export const action: ActionFunction = async ({ request, params }) => {
  const { slug } = params;
  const form = await request.formData();
  const user = await requirePlayer(request);
  const game = await db.triviaGame.findUnique({
    where: { slug },
    include: { players: true },
  });
  if (!game) {
    throw new Error(`No game found for slug: ${params.slug}`);
  }

  const actionType = form.get('_method');

  if (typeof actionType !== 'string') {
    throw new Error(`No action type found in form data.`);
  }

  switch (actionType) {
    case 'join': {
      await db.playersInTriviaGames.create({
        data: {
          player: { connect: { id: user.id } },
          triviaGame: { connect: { id: game.id } },
          isHost: false,
          score: 0,
          won: false,
        },
      });
      throw redirect(`/trivia/${slug}/lobby`);
    }
    case 'begin': {
      const isHost = game.players.some(({ playerId, isHost }) => playerId === user.id && isHost);
      if (!isHost) {
        throw new Error(`You are not the host of this game.`);
      }
      await db.triviaGame.update({ where: { slug }, data: { startedAt: new Date(), currentQuestion: 0 } });
      await db.question.update({
        where: { position_triviaGameId: { position: 0, triviaGameId: game.id } },
        data: { startedAt: addSeconds(new Date(), 5), endedAt: addSeconds(new Date(), 20) },
      });

      throw redirect(`/trivia/${slug}/play`);
    }
    default: {
      throw json('Invalid action type.', 400);
    }
  }
};

type LoaderData = {
  hostName: string;
  category: string;
  questionCount: number;
  players: (PlayersInTriviaGames & { player: { username: string } })[];
  username: string | null;
  userIsHost: boolean;
  userIsPlayer: boolean;
};
export const loader: LoaderFunction = async ({ request, params }): Promise<LoaderData> => {
  const { slug } = params;
  const data: LoaderData = {
    hostName: '',
    category: '',
    questionCount: 0,
    players: [],
    username: null,
    userIsHost: false,
    userIsPlayer: false,
  };
  const game = await db.triviaGame.findUnique({
    where: { slug },
    include: {
      players: { include: { player: { select: { username: true } } } },
      category: true,
      questions: true,
    },
  });
  if (!game) {
    throw json('Room Not Found', { status: 404 });
  }
  if (game.startedAt) {
    const url = game.endedAt ? `/trivia/${slug}/results` : `/trivia/${slug}/play`;
    throw redirect(url);
  }
  data.hostName = game.players.find((player) => player.isHost)?.player.username ?? 'Host';
  data.category = game.category ? game.category.name : 'No category, random questions';
  data.questionCount = game.questions.length;
  data.players = game.players;
  const player = await getPlayer(request);
  if (player) {
    data.username = player.username ?? null;
    data.userIsHost = game.players.some(({ playerId, isHost }) => playerId === player.id && isHost);
    data.userIsPlayer = data.userIsHost || game.players.some(({ playerId }) => playerId === player.id);
  }
  return data;
};

export default function Lobby() {
  const { slug } = useParams();
  const { hostName, category, questionCount, players, userIsHost, userIsPlayer, username } = usePolling<LoaderData>(
    `/trivia/${slug}/lobby`,
    useLoaderData<LoaderData>(),
    1000
  );
  return (
    <div>
      <h2>Welcome!</h2>
      <p>Waiting for {hostName} to start the game</p>
      <p>
        Theme will be: <span>{category}</span>
      </p>
      <p>
        with a total of <span>{questionCount}</span> questions
      </p>
      <Link to=".">Share this Link to Invite Others</Link>
      <div className="players-container">
        <h3>Players</h3>
        <ul>
          {players.map(({ player, isHost }, i) => (
            <li key={player.username}>
              <p className="player-entry">
                {`Player ${i + 1}: `}
                {player.username}
                {player.username === username ? ' (You)' : ''}
                {isHost ? ' (Host)' : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Form method="post">
        {userIsHost ? (
          <>
            <input type="hidden" name="_method" value="begin" />
            <button className="button" type="submit">
              Begin
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="_method" value="join" />
            <button className="button" disabled={userIsPlayer} type="submit">
              Join
            </button>
          </>
        )}
      </Form>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  return (
    <div>
      <h1>Caught</h1>
      <p>Status: {caught.status}</p>
      <pre>
        <code>{JSON.stringify(caught.data, null, 2)}</code>
      </pre>
    </div>
  );
}
