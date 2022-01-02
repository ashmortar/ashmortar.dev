import type { PlayersInTriviaGamesAnswers, TriviaGame } from '@prisma/client';
import { addSeconds } from 'date-fns';
import { nanoid } from 'nanoid';
import { json, redirect } from 'remix';
import { db } from './db.server';
import { requirePlayerId } from './session.server';
import { generateToken, getQuestions } from './triviaApi.server';

export type TriviaGameData = {
  playerId: string;
  categoryId: number;
  questionCount: number;
};
export async function createTriviaGame({ playerId, categoryId, questionCount }: TriviaGameData): Promise<TriviaGame> {
  const apiToken = await generateToken();
  const questions = await getQuestions(apiToken, categoryId, questionCount);
  return db.triviaGame.create({
    data: {
      slug: nanoid(6),
      apiToken,
      currentQuestion: 0,
      category: {
        connect: {
          apiId: categoryId,
        },
      },
      players: {
        create: [
          {
            score: 0,
            won: false,
            player: { connect: { id: playerId } },
            isHost: true,
          },
        ],
      },
      questions: {
        create: questions.map((question, i) => ({
          question: question.question,
          correctAnswer: question.correct_answer,
          incorrectAnswers: question.incorrect_answers,
          correctIndex: Math.floor(Math.random() * (question.incorrect_answers.length + 1)),
          difficulty: question.difficulty,
          type: question.type,
          position: i,
          category: { connect: { apiId: categoryId } },
        })),
      },
    },
  });
}

export async function requireGame(slug: string): Promise<TriviaGame> {
  const game = await db.triviaGame.findUnique({
    where: { slug },
  });
  if (!game) {
    throw json('Game not found.', 404);
  }
  return game;
}

export async function answerQuestion(
  slug: string,
  request: Request,
  answer: string
): Promise<PlayersInTriviaGamesAnswers> {
  const playerId = await requirePlayerId(request, `/trivia/${slug}/play`);

  const game = await db.triviaGame.findUnique({
    where: { slug },
    include: {
      players: { include: { player: { select: { username: true, id: true } } } },
      questions: { include: { playerAnswers: true } },
    },
  });

  if (!game) {
    throw json('Game not found.', 404);
  }

  const question = game.questions.find(({ position }) => position === game.currentQuestion);

  if (!question) {
    throw json('No current question found.', 404);
  }

  const previousAnswer = question.playerAnswers.find(({ playerId: id }) => id === playerId);
  if (previousAnswer) {
    throw redirect(`/trivia/${slug}/play`);
  }
  const answers = [question.correctAnswer, ...question.incorrectAnswers];
  const isValidAnswer = answers.includes(answer);
  if (!isValidAnswer) {
    throw json(`Invalid answer, must be one of ${answers.toString()}`, 400);
  }

  // save the answer
  const playerAnswer = await db.playersInTriviaGamesAnswers.create({
    data: {
      triviaGameId: game.id,
      playerId: playerId,
      position: question.position,
      answer,
    },
  });
  // update score
  if (question.correctAnswer === answer) {
    const score = (game.players.find(({ playerId: id }) => id === playerId)?.score ?? 0) + 1;
    await db.playersInTriviaGames.update({
      where: { playerId_triviaGameId: { playerId, triviaGameId: game.id } },
      data: { score },
    });
  }
  return playerAnswer;
}

export async function handleAdvanceQuestion(slug: string, position: number, request: Request) {
  const playerId = await requirePlayerId(request);
  const game = await db.triviaGame.findUnique({
    where: {
      slug,
    },
    include: {
      questions: { include: { playerAnswers: true } },
      players: { include: { player: { select: { username: true, id: true } } } },
    },
  });
  if (!game) {
    throw json('Game not found', 404);
  }

  if (!game.players.some((p) => p.player.id === playerId)) {
    throw json('You are not in this game', 403);
  }
  if (position !== game.currentQuestion) {
    throw redirect(`/trivia/${slug}/play`);
  }

  const questionCount = game.questions.length;
  const wasLast = game.currentQuestion === questionCount - 1;
  if (wasLast) {
    await db.triviaGame.update({
      where: { id: game.id },
      data: {
        endedAt: new Date(),
      },
    });
  } else {
    await db.triviaGame.update({
      where: { slug: game.slug },
      data: {
        currentQuestion: game.currentQuestion + 1,
      },
    });
    await db.question.update({
      where: {
        position_triviaGameId: {
          position: game.currentQuestion + 1,
          triviaGameId: game.id,
        },
      },
      data: {
        startedAt: addSeconds(new Date(), 5),
        endedAt: addSeconds(new Date(), 20),
      },
    });
  }
  throw redirect(`/trivia/${game.slug}/play`);
}
