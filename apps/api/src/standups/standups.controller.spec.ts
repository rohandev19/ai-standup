import { Test, TestingModule } from '@nestjs/testing';
import { StandupsController } from './standups.controller';
import { StandupsService } from './standups.service';
import { WorkspaceMembershipGuard } from '../common/guards/workspace-membership.guard';

describe('StandupsController', () => {
  let controller: StandupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StandupsController],
      providers: [
        {
          provide: StandupsService,
          useValue: {
            submitStandup: jest.fn(),
            editStandup: jest.fn(),
            getWorkspaceStandups: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(WorkspaceMembershipGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<StandupsController>(StandupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
