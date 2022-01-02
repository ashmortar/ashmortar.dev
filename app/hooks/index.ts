import { useEffect, useState } from 'react';
import { useFetcher } from 'remix';
import type { ClientQuestion } from '~/routes/trivia/$slug/play';

export function usePolling<T>(url: string = '', initialData: T, frequency: number = 500, pause = false): T {
  const fetcher = useFetcher();
  const [data, setData] = useState<T>(initialData);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (fetcher.state === 'idle' && !pause) {
        await fetcher.load(url);
        if (fetcher.data) {
          setData(fetcher.data as T);
        }
      }
    }, frequency);
    return () => {
      clearTimeout(interval);
    };
  }, [url, fetcher, frequency, pause]);

  return data;
}

export type QuestionState = {
  state: 'waiting' | 'playing' | 'finished';
  deadline: number;
};

export function useQuestionState(question: ClientQuestion) {
  function getState(q: ClientQuestion): QuestionState {
    const now = Date.now();
    let startTime;
    let endTime;
    let gs: QuestionState = {
      state: 'waiting',
      deadline: 0,
    };
    if (q.startedAt) {
      startTime = new Date(q.startedAt).getTime();
    }
    if (q.endedAt) {
      endTime = new Date(q.endedAt).getTime();
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
