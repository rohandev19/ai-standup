import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [AiService, CircuitBreakerService],
  exports: [AiService, CircuitBreakerService],
})
export class AiModule {}
