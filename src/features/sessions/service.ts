import type { SessionInput, SessionStored } from './schemas';
import { createInMemoryRepository, type SessionRepository } from './repository';
import * as mappers from './mappers';
import { NotFoundError } from '../../errors';

export type SessionService = {
  list(): SessionStored[];
  get(id: string): SessionStored;
  create(input: SessionInput): SessionStored;
  update(id: string, input: SessionInput): SessionStored;
  remove(id: string): void;
};

export const createSessionService = (repo: SessionRepository): SessionService => ({
  list: () => repo.all(),
  get: (id) => {
    const found = repo.get(id);
    if (!found) throw new NotFoundError(`Session ${id} not found`);
    return found;
  },
  create: (input) => repo.save(mappers.toStored(input)),
  update: (id, input) => {
    const existing = repo.get(id);
    if (!existing) throw new NotFoundError(`Session ${id} not found`);
    return repo.save(mappers.applyUpdate(existing, input));
  },
  remove: (id) => {
    if (!repo.remove(id)) throw new NotFoundError(`Session ${id} not found`);
  },
});

// Default singleton wired with the in-memory repo. The running app uses this;
// tests construct their own via createSessionService(createInMemoryRepository()).
export const sessionService = createSessionService(createInMemoryRepository());
