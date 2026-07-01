import type { Env } from '../../env';
import { json } from '../../lib/db';

export const onRequestGet: PagesFunction<Env, string, { username: string }> = async ({ data }) => {
  return json({ username: data.username });
};
