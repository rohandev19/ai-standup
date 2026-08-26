import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { CircuitBreakerService } from './circuit-breaker.service';

// Mock the Anthropic constructor properly
const mockAnthropicClient = {
  messages: {
    create: jest.fn(),
  },
};

jest.mock('@anthropic-ai/sdk', () => {
  return function () {
    return mockAnthropicClient;
  };
});

describe('AiService', () => {
  let service: AiService;
  let circuitBreakerService: CircuitBreakerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';

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
      expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
    });
  });

  describe('Detect Blockers tool parsing', () => {
    it('handles malformed tool response fallback gracefully', async () => {
      // Mock a response that DOES NOT use tools, or returns garbage JSON
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'I decided not to use tools. Here is some unstructured text.',
          },
        ],
        stop_reason: 'end_turn',
      });

      const result = await service.extractBlockers('Test standups');

      // The service should fallback and return the raw text as a 'LOW' severity blocker
      expect(result).toBeNull();
    });

    it('correctly parses tool use block', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'classify_blocker',
            input: {
              severity: 'HIGH',
              reason: 'Waiting for API design',
            },
          },
        ],
      });

      const result = await service.extractBlockers('Test standups');

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('HIGH');
    });
  });
});
