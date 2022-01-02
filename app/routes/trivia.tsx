import type { Player, TriviaCategory, TriviaGame } from '@prisma/client';
import type { LinksFunction, LoaderFunction } from 'remix';
import { useLoaderData } from 'remix';
import { Link, Outlet } from 'remix';
import { formatRelativeDate } from '~/utils/date';
import { db } from '~/utils/db.server';
import { getPlayer } from '~/utils/session.server';
import stylesUrl from '../styles/trivia.css';

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: stylesUrl,
    },
  ];
};

type LoaderData = {
  liveGames: Array<Pick<TriviaGame, 'slug' | 'startedAt'> & { category: TriviaCategory | null }>;
  user: Player | null;
};
export const loader: LoaderFunction = async ({ request }) => {
  const gameIsLive = { startedAt: { not: null }, endedAt: null };

  const liveGameCount = await db.triviaGame.count({
    where: gameIsLive,
  });

  const take = Math.min(liveGameCount, 5);

  const liveGames = await db.triviaGame.findMany({
    select: { slug: true, startedAt: true, category: true },
    where: gameIsLive,
    take,
    orderBy: { startedAt: 'desc' },
  });
  const user = await getPlayer(request);

  const data: LoaderData = { liveGames, user };
  return data;
};

export default function TriviaRoute() {
  const { liveGames, user } = useLoaderData<LoaderData>();

  return (
    <div className="trivia-layout">
      <header className="trivia-header">
        <div className="container">
          <Link to="/" title="Ashmortar.dev home" aria-label="Ashmortar.dev home">
            <img className="svg-logo" src="/images/midi.svg" alt="Ashmortar.dev logo" />
          </Link>
          {user ? (
            <div className="user-info">
              <div className="user-spans">
                <span>{`Hi, ${user.username}`}</span>
                <Link to="/trivia" title="My Trivia Games">
                  <span>your games</span>
                </Link>
              </div>
              <form action="/logout" method="post">
                <button type="submit" className="button">
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <div>
              <Link to="/login">Login</Link>
            </div>
          )}
        </div>
      </header>
      <main className="trivia-main">
        <div className="container">
          <div className="trivia-outlet">
            <Outlet />
          </div>
          <div className="live-games">
            <p>Here are some live games:</p>
            <ul>
              {liveGames.length > 0 ? (
                liveGames.map(({ slug, category, startedAt }) => (
                  <li key={slug}>
                    <Link to={`/trivia/${slug}`} className="live-game-link">
                      <span>{`Category: ${category?.name ?? 'none'}`} </span>
                      <small>{`started: ${startedAt ? formatRelativeDate(startedAt) : ''}`}</small>
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <em>No games are currently live.</em>
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
