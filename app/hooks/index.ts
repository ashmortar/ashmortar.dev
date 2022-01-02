import { useRef, useEffect, useState } from 'react';
import { useFetcher } from 'remix';
import type { ClientPlayerAnswer, ClientQuestion } from '~/routes/trivia/$slug/play';

export function usePolling(slug: string = '', fetcher: ReturnType<typeof useFetcher>) {
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      if (fetcher.state === 'idle') {
        await fetcher.load(`/trivia/${slug}/play`);
      }
    }, 500);
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, [slug]);
}

export type QuestionState = {
  state: 'waiting' | 'playing' | 'finished';
  deadline: number;
};

export function useQuestionState(question: ClientQuestion) {
  function getState(question: ClientQuestion): QuestionState {
    const now = Date.now();
    let startTime;
    let endTime;
    let gs: QuestionState = {
      state: 'waiting',
      deadline: 0,
    };
    if (question.startedAt) {
      startTime = new Date(question.startedAt).getTime();
    }
    if (question.endedAt) {
      endTime = new Date(question.endedAt).getTime();
    }
    if (startTime && endTime) {
      if (now < startTime) {
        gs = { state: 'waiting', deadline: startTime };
      } else if (now >= startTime && now <= endTime) {
        gs = { state: 'playing', deadline: endTime };
      } else if (now > endTime) {
        gs = { state: 'finished', deadline: 0 };
      }
    } else {
      console.log();
      throw new Error('Invalid question state');
    }
    return gs;
  }

  const [state, setState] = useState<QuestionState>(getState(question));

  useEffect(() => {
    setState(getState(question));
  }, [question]);

  return state;
}
