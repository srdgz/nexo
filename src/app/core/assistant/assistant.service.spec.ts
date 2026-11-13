import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../testing/i18n';
import { Session } from '../session/session';
import {
  ASSISTANT_MODEL_LOADER,
  ASSISTANT_TOOLS,
  type AssistantTool,
  type ModelReply,
  type ModelRequest,
  ToolInputError,
} from './assistant';
import { AssistantService, MAX_MODEL_ROUNDS } from './assistant.service';

describe('AssistantService', () => {
  let requests: ModelRequest[];
  let saved: unknown[];

  const readTool: AssistantTool = {
    name: 'list_things',
    description: 'Lists things',
    parameters: { type: 'object', properties: {} },
    writes: false,
    run: () => Promise.resolve(['a', 'b']),
  };
  const writeTool: AssistantTool = {
    name: 'add_thing',
    description: 'Adds a thing',
    parameters: { type: 'object', properties: { name: { type: 'string' } } },
    writes: true,
    describe: (input) =>
      input['name']
        ? Promise.resolve(`Add ${String(input['name'])}`)
        : Promise.reject(new ToolInputError('name is required.')),
    run: (input) => {
      saved.push(input);
      return Promise.resolve({ ok: true });
    },
  };

  function setup(replies: ModelReply[]): AssistantService {
    requests = [];
    saved = [];
    const queue = [...replies];
    TestBed.configureTestingModule({
      imports: [provideTestI18n()],
      providers: [
        { provide: Session, useValue: { user: signal({ weekStartsOn: 0 }) } },
        { provide: ASSISTANT_TOOLS, multi: true, useValue: [readTool, writeTool] },
        {
          provide: ASSISTANT_MODEL_LOADER,
          useValue: () =>
            Promise.resolve({
              reply: (request: ModelRequest) => {
                requests.push(request);
                return Promise.resolve(
                  queue.shift() ?? {
                    text: 'again',
                    calls: [{ id: 'x', name: 'list_things', args: {} }],
                  },
                );
              },
            }),
        },
      ],
    });
    return TestBed.inject(AssistantService);
  }

  it('runs read tools, sends the results back and returns the answer', async () => {
    const assistant = setup([
      { text: '', calls: [{ id: 'c1', name: 'list_things', args: {} }], raw: { opaque: 1 } },
      { text: 'You have two things.', calls: [] },
    ]);

    const turns = await assistant.run([{ role: 'user', text: 'What do I have?' }], {
      mode: 'chat',
      confirm: () => Promise.resolve(true),
    });

    expect(requests[0]?.tools.map((tool) => tool.name)).toEqual(['list_things', 'add_thing']);
    expect(requests[0]?.context).toEqual({
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      language: 'es',
      weekStartsOn: 0,
    });
    expect(turns).toEqual([
      { role: 'user', text: 'What do I have?' },
      {
        role: 'model',
        text: '',
        calls: [{ id: 'c1', name: 'list_things', args: {} }],
        raw: { opaque: 1 },
      },
      {
        role: 'tool',
        results: [{ id: 'c1', name: 'list_things', output: { result: ['a', 'b'] } }],
      },
      { role: 'model', text: 'You have two things.', calls: [] },
    ]);
  });

  it('asks before running a tool that changes data', async () => {
    const assistant = setup([
      { text: '', calls: [{ id: 'c1', name: 'add_thing', args: { name: 'pen' } }] },
      { text: 'Saved.', calls: [] },
    ]);
    const confirm = vi.fn(() => Promise.resolve(true));

    await assistant.run([{ role: 'user', text: 'Add a pen' }], { mode: 'capture', confirm });

    expect(confirm).toHaveBeenCalledWith({ id: 'c1', tool: 'add_thing', summary: 'Add pen' });
    expect(saved).toEqual([{ name: 'pen' }]);
    expect(requests[1]?.mode).toBe('capture');
  });

  it('tells the model when the user declines or the input is wrong', async () => {
    const assistant = setup([
      {
        text: '',
        calls: [
          { id: 'c1', name: 'add_thing', args: { name: 'pen' } },
          { id: 'c2', name: 'add_thing', args: {} },
          { id: 'c3', name: 'delete_all', args: {} },
        ],
      },
      { text: 'Nothing saved.', calls: [] },
    ]);

    const turns = await assistant.run([{ role: 'user', text: 'Add' }], {
      mode: 'chat',
      confirm: () => Promise.resolve(false),
    });

    expect(saved).toEqual([]);
    expect(turns[2]).toEqual({
      role: 'tool',
      results: [
        {
          id: 'c1',
          name: 'add_thing',
          output: { declined: true, message: 'The user cancelled this action.' },
        },
        { id: 'c2', name: 'add_thing', output: { error: 'name is required.' } },
        { id: 'c3', name: 'delete_all', output: { error: 'Unknown tool delete_all.' } },
      ],
    });
  });

  it('stops after a fixed number of model rounds', async () => {
    const assistant = setup([]);

    await assistant.run([{ role: 'user', text: 'Loop' }], {
      mode: 'chat',
      confirm: () => Promise.resolve(true),
    });

    expect(requests).toHaveLength(MAX_MODEL_ROUNDS);
  });
});
