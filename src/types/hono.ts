import type { auth } from '../lib/auth';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AppEnv = {
  Variables: {
    user: Session['user'] | null;
    session: Session['session'] | null;
  };
};

/** The subset of the logged-in user that services need for ownership/role checks. */
export type ActingUser = Pick<Session['user'], 'id' | 'role'>;
