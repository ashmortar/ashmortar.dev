import { Form, json, redirect, useCatch, useFetcher, useLoaderData, useParams, useSubmit } from 'remix';
import type { ActionFunction, LoaderFunction, LinksFunction } from 'remix';
import { getPlayer } from '~/utils/session.server';
import { db } from '~/utils/db.server';
import { usePolling, useQuestionState } from '~/hooks';
import { formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { answerQuestion, handleAdvanceQuestion } from '~/utils/triviaGame.server';
import styles from '~/styles/play.css';

export const links: LinksFunction = () => [
  {
    href: styles,
    rel: 'stylesheet',
  },
];

export const action: ActionFunction = async ({ params, request }) => {
  const { slug } = params;
  if (!slug) {
    return redirect('/trivia');
  }

  const form = await request.formData();

  const advance = form.get('advance');

  if (advance) {
    const position = await form.get('position');
    if (!position) {
      throw json('position is required', 400);
    }
    return handleAdvanceQuestion(slug, Number(position), request);
  } else {
    const answer = await form.get('answer');
    if (!answer || typeof answer !== 'string') {
      throw json('answer is required', 400);
    }

    return await answerQuestion(slug, request, answer);
  }
};

export type ClientQuestion = {
  question: string;
  answers: string[];
  correctAnswer: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  position: number;
  count: number;
};

export type ClientPlayerAnswer = { username: string; answer: string } | undefined;

type LoaderData = {
  player: {
    username: string;
    score: number;
    won: boolean;
  } | null;
  question: ClientQuestion;
  playersAnswers: ClientPlayerAnswer[];
};
export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getPlayer(request);
  const game = await db.triviaGame.findUnique({
    where: {
      slug: params.slug,
    },
    include: {
      players: { include: { player: { select: { username: true } } } },
      questions: { include: { playerAnswers: true } },
    },
  });
  if (!game) {
    throw json('Game not found', 404);
  }

  if (game.endedAt) {
    throw redirect(`/trivia/${params.slug}/results`);
  }
  const player = game.players.find(({ playerId }) => playerId === user?.id) ?? null;
  const question = game.questions.find(({ position }) => position === game.currentQuestion);

  if (!question) {
    throw json('No question found', 404);
  }
  const incorrect = [...question.incorrectAnswers];
  const answers = Array(question.incorrectAnswers.length + 1)
    .fill('')
    .map((_, i) => (question.correctIndex === i ? question.correctAnswer : `${incorrect.pop()}`));

  const hasEnded = question.endedAt && new Date(question.endedAt).getTime() < Date.now();
  const data: LoaderData = {
    player: player
      ? {
          username: player.player.username,
          score: player.score,
          won: player.won,
        }
      : null,
    question: {
      question: question.question,
      answers,
      startedAt: question.startedAt ? new Date(question.startedAt) : null,
      endedAt: question.endedAt ? new Date(`${question.endedAt}`) : null,
      correctAnswer: hasEnded ? question.correctAnswer : null,
      position: question.position,
      count: game.questions.length,
    },
    playersAnswers: question.playerAnswers.map(({ playerId, answer }) => ({
      username: game.players.find(({ playerId: id }) => id === playerId)?.player.username ?? '',
      answer: answer ?? '',
    })),
  };

  return data;
};

export default function Play() {
  const { slug } = useParams();
  const [answering, setAnswering] = useState(false);
  const { player, question, playersAnswers } = usePolling<LoaderData>(
    `/trivia/${slug}/play`,
    useLoaderData<LoaderData>(),
    1000,
    answering
  );

  const { state, deadline } = useQuestionState(question);

  switch (state) {
    case 'waiting': {
      return <Waiting deadline={new Date(deadline)} />;
    }
    case 'playing': {
      return (
        <Active
          deadline={new Date(deadline)}
          question={question}
          playerAnswers={playersAnswers}
          username={player?.username ?? null}
          setAnswering={setAnswering}
        />
      );
    }

    case 'finished': {
      return <Finished question={question} playerAnswers={playersAnswers} username={player?.username ?? null} />;
    }

    default: {
      throw new Error(`Unknown state: ${state}`);
    }
  }
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

function Waiting({ deadline }: { deadline: Date }) {
  return (
    <div>
      <h3>Game Time!</h3>
      <p>waiting to start...</p>
      <p>
        <span>{formatDistanceToNowStrict(deadline)}</span> left
      </p>
    </div>
  );
}

function Active({
  deadline,
  question,
  playerAnswers,
  username,
  setAnswering,
}: {
  deadline: Date;
  question: ClientQuestion;
  playerAnswers: ClientPlayerAnswer[];
  username: string | null;
  setAnswering: (answering: boolean) => void;
}) {
  const hasAnswered = !!username && !!playerAnswers.find((pA) => pA && pA.username === username);
  const fetcher = useFetcher();
  useEffect(() => {
    if (fetcher.state === 'submitting') {
      setAnswering(true);
    } else {
      setAnswering(false);
    }
  }, [fetcher, setAnswering]);
  return (
    <div>
      <h3>Game Time!</h3>
      <p>
        you have <span>{formatDistanceToNowStrict(deadline)}</span> left to answer the question
      </p>

      <div>
        <h5 dangerouslySetInnerHTML={{ __html: `${question.position + 1}. ${question.question}` }} />
        <ul>
          {question.answers.map((answer, i) => {
            return (
              <li style={{ listStyle: 'none', paddingBottom: '1rem' }} key={answer}>
                <Form method="post">
                  <input type="hidden" name="answer" value={answer} />
                  <button
                    type="submit"
                    className="button answer-button"
                    disabled={!username || (!!username && playerAnswers.some((a) => a?.username === username))}
                    dangerouslySetInnerHTML={{
                      __html: `${answer} 
                    ${
                      hasAnswered
                        ? playerAnswers
                            .filter((pA) => pA && pA.answer === answer)
                            .map((p) => (p?.username === username ? 'you' : `${p?.username}`))
                            .join(', ')
                        : ''
                    }`,
                    }}
                  />
                </Form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Finished({
  question,
  playerAnswers,
  username,
}: {
  question: ClientQuestion;
  playerAnswers: ClientPlayerAnswer[];
  username: string | null;
}) {
  const fetcher = useFetcher();
  const submitted = useRef(false);
  useEffect(() => {
    const now = Date.now();
    const endedAt = new Date(question.endedAt ?? now).getTime();
    if (now - endedAt > 1000 * 5 && !submitted.current) {
      const data = new FormData();
      data.append('advance', 'true');
      data.append('position', question.position.toString());
      fetcher.submit(data, { method: 'post' });
      submitted.current = true;
    }
  }, [question]);
  return (
    <div>
      <h3>Game Time!</h3>
      <p>Question Completed!, next question will start soon</p>

      <div>
        <h4 dangerouslySetInnerHTML={{ __html: `${question.position + 1}. ${question.question}` }} />
        <ul>
          {question.answers.map((answer, i) => {
            return (
              <li style={{ listStyle: 'none', paddingBottom: '1rem' }} key={answer}>
                <Form>
                  <button
                    className={`button${answer === question.correctAnswer ? ' is-success' : 'is-failure'}`}
                    disabled={true}
                  >
                    {answer}{' '}
                    {playerAnswers
                      .filter((pA) => pA && pA.answer === answer)
                      .map((p) => (p?.username === username ? 'you' : `${p?.username}`))
                      .join(', ')}
                  </button>
                </Form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
