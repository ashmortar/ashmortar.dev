import { prisma, TriviaCategory, TriviaGame } from '@prisma/client';
import axios from 'axios';
import { json } from 'remix';
import { db } from './db.server';

const ONE_DAY = 1000 * 60 * 60 * 24;

export type ApiCategory = {
  id: number;
  name: string;
};
type CategoriesResponse = {
  trivia_categories: ApiCategory[];
};
export async function getTriviaCategories(): Promise<ApiCategory[]> {
  const url = new URL('https://opentdb.com/api_category.php');
  try {
    const response = await axios.get<CategoriesResponse>(url.toString());
    return response.data.trivia_categories;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to get trivia categories.');
  }
}

type QuestionCountResponse = {
  category_id: number;
  category_question_count: {
    total_question_count: number;
    total_easy_question_count: number;
    total_medium_question_count: number;
    total_hard_question_count: number;
  };
};
type DatabaseCountFields = {
  totalQuestions: number;
  easyQuestions: number;
  mediumQuestions: number;
  hardQuestions: number;
};
export async function getQuestionCounts(apiId: number): Promise<DatabaseCountFields> {
  const url = new URL('https://opentdb.com/api_count.php');
  url.searchParams.set('category', apiId.toString());

  try {
    const response = await axios.get<QuestionCountResponse>(url.toString());
    return {
      totalQuestions: response.data.category_question_count.total_question_count,
      easyQuestions: response.data.category_question_count.total_easy_question_count,
      mediumQuestions: response.data.category_question_count.total_medium_question_count,
      hardQuestions: response.data.category_question_count.total_hard_question_count,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Failed to get question count.');
  }
}

/**
 * Checks if createdAt is more than a day old.
 * @param category
 * @returns boolean
 */
export function categoryIsStale(category: TriviaCategory): boolean {
  const updatedAt = new Date(category.updatedAt);
  const now = new Date();
  return now.getTime() - updatedAt.getTime() > ONE_DAY;
}

export async function syncCategories(): Promise<TriviaCategory[]> {
  const freshCategories = await getTriviaCategories();
  const questionCounts = await Promise.all(freshCategories.map((c) => getQuestionCounts(c.id)));
  let categories: TriviaCategory[] = [];
  try {
    categories = await db.$transaction(async (prisma) => {
      // deactivate old categories
      await prisma.triviaCategory.updateMany({
        data: { available: false },
        where: {
          apiId: { notIn: freshCategories.map((c) => c.id) },
        },
      });
      // upsert fresh categories
      const upserts = await Promise.all(
        freshCategories.map(async (category, i) => {
          return prisma.triviaCategory.upsert({
            select: {
              id: true,
              createdAt: true,
              available: true,
              updatedAt: true,
              apiId: true,
              questions: true,
              easyQuestions: true,
              mediumQuestions: true,
              hardQuestions: true,
              name: true,
              totalQuestions: true,
            },
            where: {
              apiId: category.id,
            },
            update: {
              name: category.name,
              available: true,
              ...questionCounts[i],
            },
            create: {
              apiId: category.id,
              name: category.name,
              available: true,
              ...questionCounts[i],
            },
          });
        })
      );
      return upserts;
    });
  } catch (e) {
    console.error(e);
    throw new Error('Failed to upsert categories.');
  }
  return categories;
}

type TokenResponse = {
  response_code: number;
  response_message: string;
  token: string;
};
export async function generateToken() {
  const url = new URL('https://opentdb.com/api_token.php');
  url.searchParams.set('command', 'request');
  try {
    const response = await axios.get<TokenResponse>(url.toString());
    return response.data.token;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to generate token.');
  }
}

export type TriviaQuestion = {
  category: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  question: string;
  type: string;
};
export type TriviaQuestionResponse = {
  response_code: number;
  results: TriviaQuestion[];
};
export async function getQuestions(
  token: string,
  categoryId: number,
  questionCount: number
): Promise<TriviaQuestion[]> {
  const url = new URL('https://opentdb.com/api.php');
  url.searchParams.set('amount', questionCount.toString());
  url.searchParams.set('category', categoryId.toString());
  url.searchParams.set('token', token);
  try {
    const response = await axios.get<TriviaQuestionResponse>(url.toString());
    return response.data.results;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to get questions.');
  }
}
