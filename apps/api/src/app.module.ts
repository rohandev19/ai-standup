import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueuesModule } from './queues/queues.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { TeamsModule } from './teams/teams.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { StandupsModule } from './standups/standups.module';
import { SummariesModule } from './summaries/summaries.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.body.password'],
      },
    }),
    RedisModule,
    PrismaModule,
    QueuesModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    TeamsModule,
    EventsModule,
    AiModule,
    StandupsModule,
    SummariesModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
