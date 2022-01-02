import { json, redirect, useLoaderData } from 'remix';
import type { PlayersInTriviaGames } from '@prisma/client';
import type { LoaderFunction, LinksFunction } from 'remix';
import { db } from '~/utils/db.server';
import { formatDistanceToNow } from 'date-fns';
import styles from '~/styles/results.css';

export const links: LinksFunction = () => [
  {
    href: styles,
    rel: 'stylesheet',
  },
];

export type LoaderData = {
  gameEndedAt: Date;
  category: string;
  questionCount: number;
  playerScores: (PlayersInTriviaGames & { player: { username: string; id: string }; rank: number })[];
};
export const loader: LoaderFunction = async ({ request, params }) => {
  const { slug } = params;
  const game = await db.triviaGame.findUnique({
    where: { slug },
    include: {
      category: true,
      players: { include: { player: { select: { username: true, id: true } } } },
      questions: true,
    },
  });
  if (!game) {
    throw json('Game not found', 404);
  }
  if (!game.endedAt) {
    throw redirect(`/trivia/${slug}/${game.startedAt ? 'play' : 'lobby'}`);
  }
  console.log({ game });
  const data: LoaderData = {
    gameEndedAt: game.endedAt,
    category: game.category?.name ?? 'No category, random questions',
    questionCount: game.questions.length,
    playerScores: game.players.sort((a, b) => b.score - a.score).map((player, i) => ({ ...player, rank: i + 1 })),
  };
  return data;
};

export default function Results() {
  const { gameEndedAt, category, questionCount, playerScores } = useLoaderData<LoaderData>();
  return (
    <div>
      <h3>Results</h3>
      <h4>Game ended {formatDistanceToNow(new Date(gameEndedAt), { addSuffix: true })}</h4>
      <p>
        Category: {category}, {questionCount} questions
      </p>
      <h4>Scores</h4>
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {playerScores.map(({ player, score, rank }) => (
            <tr key={player.id}>
              <td>{rank}</td>
              <td>{player.username}</td>
              <td>{score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
