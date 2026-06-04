import { routeNotionWebhookToLangGraph } from './notionRouter';

describe('routeNotionWebhookToLangGraph', () => {
  test('routes page.updated from Ideas database into LangGraph chat', async () => {
    const assistant = {
      handleUserMessage: jest.fn(async () => ({ ok: true })),
    };

    const body = {
      type: 'page.updated',
      data: {
        database_id: 'ideas-db',
        page_id: 'page-123',
        title: 'New idea: event-driven automations',
        url: 'https://notion.so/page-123',
      },
    };

    const result = await routeNotionWebhookToLangGraph(body, {
      assistant,
      ideasDatabaseId: 'ideas-db',
    });

    expect(result.routed).toBe(true);
    expect(assistant.handleUserMessage).toHaveBeenCalledTimes(1);
    expect(assistant.handleUserMessage).toHaveBeenCalledWith(
      'notion',
      expect.stringContaining('New idea: event-driven automations'),
      'notion:page-123'
    );
  });

  test('does not route non-Ideas database updates', async () => {
    const assistant = {
      handleUserMessage: jest.fn(async () => ({ ok: true })),
    };

    const body = {
      type: 'page.updated',
      data: {
        database_id: 'some-other-db',
        page_id: 'page-999',
        title: 'Not an idea',
      },
    };

    const result = await routeNotionWebhookToLangGraph(body, {
      assistant,
      ideasDatabaseId: 'ideas-db',
    });

    expect(result.routed).toBe(false);
    expect(result.reason).toBe('not_ideas_db');
    expect(assistant.handleUserMessage).not.toHaveBeenCalled();
  });
});

