import type { TriviaCategory, TriviaGame } from '@prisma/client';
import type { LoaderFunction } from 'remix';
import { Link, useLoaderData } from 'remix';
import { formatRelativeDate } from '~/utils/date';
import { db } from '~/utils/db.server';
import { getPlayer } from '~/utils/session.server';

type LoaderData = {
  pastGames: (TriviaGame & { category: TriviaCategory | null })[];
  currentGames: (TriviaGame & { category: TriviaCategory | null })[];
  upcomingGames: (TriviaGame & { category: TriviaCategory | null })[];
  username: string | null;
};

export const loader: LoaderFunction = async ({ request }): Promise<LoaderData> => {
  const player = await getPlayer(request);
  const data: LoaderData = {
    pastGames: [],
    currentGames: [],
    upcomingGames: [],
    username: null,
  };
  if (!player) {
    return data;
  }
  data.username = player.username;
  const games = await db.triviaGame.findMany({
    where: {
      players: {
        some: {
          player: {
            username: player.username,
          },
        },
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  games.forEach((game) => {
    if (game.endedAt) {
      data.pastGames.push(game);
    } else if (game.startedAt) {
      data.currentGames.push(game);
    } else {
      data.upcomingGames.push(game);
    }
  });
  return data;
};

export default function TriviaIndexRoute() {
  const { pastGames, currentGames, upcomingGames, username } = useLoaderData<LoaderData>();

  const numberOfGames = pastGames.length + currentGames.length + upcomingGames.length;

  if (!username) {
    return (
      <div>
        <h2>My Games</h2>
        <div className="to-login">
          <Link to="/login">You must be logged in to view your games</Link>
        </div>
        <Link to="new" className="button link-button">
          Create A Game
        </Link>
      </div>
    );
  }

  if (numberOfGames === 0) {
    return (
      <div>
        <h2>My Games</h2>
        <br />
        <p>You have no games</p>
        <Link to="new" className="button link-button">
          Create A Game
        </Link>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>My Games</h2>
        <br />
        <Link to="new" className="button link-button">
          Create A Game
        </Link>
      </div>
      {currentGames.length > 0 && (
        <>
          <h3>
            Current Games <small>{currentGames.length}</small>
          </h3>
          <ul>
            {currentGames.map(({ slug, category, startedAt }) => (
              <li key={slug}>
                <Link to={`${slug}/play`}>{`Category: ${category?.name ?? 'none'}, started: ${
                  startedAt ? formatRelativeDate(startedAt) : ''
                }`}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {upcomingGames.length > 0 && (
        <>
          <h3>
            Upcoming Games <small>{upcomingGames.length}</small>
          </h3>
          <ul>
            {upcomingGames.map(({ slug, category, createdAt }) => (
              <li key={slug}>
                <Link to={`${slug}/lobby`}>{`Category: ${category?.name ?? 'none'}, created: ${formatRelativeDate(
                  createdAt
                )}`}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {pastGames.length > 0 && (
        <>
          <h3>
            Past Games <small>{pastGames.length}</small>
          </h3>
          <ul>
            {pastGames.map(({ slug, category, endedAt }) => (
              <li key={slug}>
                <Link to={`${slug}/results`}>{`Category: ${category?.name ?? 'none'}, ended: ${
                  endedAt ? formatRelativeDate(endedAt) : ''
                }`}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="error-container">
      <pre>{error.message}</pre>
    </div>
  );
}
