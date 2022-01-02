import { Player, PlayersInTriviaGames, PlayersInTriviaGamesAnswers, TriviaGame } from '@prisma/client';
import { nanoid } from 'nanoid';
import { json } from 'remix';
import { db } from './db.server';
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

export async function requireNotAnswered(game: TriviaGame, player: Player): Promise<void> {
  const playerAnswer = await db.playersInTriviaGamesAnswers.findUnique({
    where: {
      playerId_triviaGameId_position: {
        triviaGameId: game.id,
        playerId: player.id,
        position: game.currentQuestion,
      },
    },
  });
  if (playerAnswer) {
    throw json('You have already answered this question.', 400);
  }
}

export async function answerQuestion(
  game: TriviaGame,
  formData: FormData,
  player: Player,
  playerInGame: PlayersInTriviaGames
): Promise<PlayersInTriviaGamesAnswers> {
  const answer = formData.get('answer');
  if (typeof answer !== 'string') {
    throw json('Form is formatted incorrectly.', 400);
  }

  const question = await db.question.findUnique({
    where: {
      position_triviaGameId: {
        position: game.currentQuestion,
        triviaGameId: game.id,
      },
    },
  });

  if (!question) {
    throw json('No current question found.', 404);
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
      playerId: player.id,
      position: question.position,
      answer,
    },
  });
  // update score
  const isCorrect = question.correctAnswer === answer;
  const score = isCorrect ? playerInGame.score + 1 : playerInGame.score;
  await db.playersInTriviaGames.update({
    where: { playerId_triviaGameId: { playerId: player.id, triviaGameId: game.id } },
    data: { score },
  });
  return playerAnswer;
}
