import type { TriviaCategory } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from 'remix';
import { Form, useLoaderData, json, redirect } from 'remix';
import { db } from '~/utils/db.server';
import { requirePlayerId } from '~/utils/session.server';
import { categoryIsStale, syncCategories } from '~/utils/triviaApi.server';
import { createTriviaGame } from '~/utils/triviaGame.server';

function validateCategory(categoryId: unknown) {
  if (!Number.isInteger(categoryId)) {
    return 'CategoryId must be a number';
  }
}

function validateQuestionCount(questionCount: unknown) {
  if (typeof questionCount !== 'number') {
    return `Question count must be a number`;
  }
  if (!Number.isInteger(questionCount) || questionCount < 1) {
    return `Question count must be a positive integer`;
  }
  if (questionCount > 20) {
    return `Question count must be less than 20`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    categoryId: string | undefined;
    questionCount: string | undefined;
  };
  fields?: {
    categoryId: number;
    questionCount: number;
  };
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

export const action: ActionFunction = async ({ request }) => {
  const playerId = await requirePlayerId(request);
  const form = await request.formData();
  const categoryId = Number(form.get('categoryId'));
  const questionCount = Number(form.get('questionCount'));
  if (Number.isNaN(categoryId) || Number.isNaN(questionCount)) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }
  const fieldErrors = {
    categoryId: validateCategory(categoryId),
    questionCount: validateQuestionCount(questionCount),
  };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields: { categoryId, questionCount } });
  }

  const triviaGame = await createTriviaGame({
    playerId,
    categoryId,
    questionCount,
  });

  return redirect(`/trivia/${triviaGame.slug}/lobby`);
};

type LoaderData = {
  categories: TriviaCategory[];
};

export const loader: LoaderFunction = async (): Promise<LoaderData> => {
  const categories = await db.triviaCategory.findMany({ where: { available: true } });

  return { categories };
};

export default function NewTriviaRoute() {
  const { categories } = useLoaderData<LoaderData>();
  return (
    <div className="new-game-container">
      <h1>Create a New Game</h1>
      <br />
      <Form method="post">
        <label htmlFor="category">
          <span>Category</span>
        </label>
        <select name="categoryId">
          {categories.map((category) => (
            <option key={category.apiId} value={category.apiId}>
              {`${category.name} - ${category.totalQuestions} questions`}
            </option>
          ))}
        </select>
        <label htmlFor="questionCount">
          <span>Question Count</span>
        </label>
        <input type="number" name="questionCount" min="1" max="20" step={1} defaultValue={10} />
        <button type="submit" className="button">
          Create Room
        </button>
      </Form>
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
