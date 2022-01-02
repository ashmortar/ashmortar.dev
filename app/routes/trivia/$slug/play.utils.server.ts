import { PlayersInTriviaGames, PlayersInTriviaGamesAnswers, Question, TriviaGame } from '@prisma/client';
import { addSeconds } from 'date-fns';
import { redirect } from 'remix';
import { db } from '~/utils/db.server';

export async function handleAdvanceQuestion(game: TriviaGame) {
  const questionCount = await db.question.count({
    where: {
      triviaGameId: game.id,
    },
  });
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
