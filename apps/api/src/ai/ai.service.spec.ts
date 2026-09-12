import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { CircuitBreakerService } from './circuit-breaker.service';

// Mock the OpenAI constructor properly
const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: function () {
      return mockOpenAIClient;
    },
  };
});

describe('AiService', () => {
  let service: AiService;
  let circuitBreakerService: CircuitBreakerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.EXPLABS_API_KEY = 'test-key';

    // We mock CircuitBreakerService to easily throw or execute
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn(async (serviceName, action) => {
              return await action(); // By default, just execute the action
            }),
            recordSuccess: jest.fn(),
            recordFailure: jest.fn(),
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    circuitBreakerService = module.get<CircuitBreakerService>(
      CircuitBreakerService,
    );
  });

  describe('Circuit breaker integration', () => {
    it('fails fast when circuit breaker rejects (5 failures)', async () => {
      // Mock circuit breaker to reject immediately without calling the action
      jest
        .spyOn(circuitBreakerService, 'execute')
        .mockRejectedValue(new Error('Circuit breaker open'));

      await expect(
        service.generateDailySummary('Test standups'),
      ).rejects.toThrow('Circuit breaker open');
      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalled();
    });
  });

  describe('Detect Blockers tool parsing', () => {
    it('handles response without tool_calls gracefully', async () => {
      // Mock a response that DOES NOT use tools
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content:
                'I decided not to use tools. Here is some unstructured text.',
              tool_calls: undefined,
            },
            finish_reason: 'stop',
          },
        ],
      });

      const result = await service.extractBlockers('Test standups');

      expect(result).toBeNull();
    });

    it('correctly parses tool_calls response', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'classify_blocker',
                    arguments: JSON.stringify({
                      severity: 'HIGH',
                      reason: 'Waiting for API design',
                    }),
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      });

      const result = await service.extractBlockers('Test standups');

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('HIGH');
      expect(result?.reason).toBe('Waiting for API design');
    });
  });
});
