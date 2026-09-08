import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler } from './action-handler.interface';

@Injectable()
export class ActionRegistryService {
  private readonly logger = new Logger(ActionRegistryService.name);
  private handlers = new Map<string, IActionHandler>();

  register(handler: IActionHandler) {
    if (this.handlers.has(handler.actionType)) {
      this.logger.warn(`Action handler for ${handler.actionType} is already registered. Overwriting.`);
    }
    this.handlers.set(handler.actionType, handler);
    this.logger.debug(`Registered action handler for: ${handler.actionType}`);
  }

  getHandler(actionType: string): IActionHandler | undefined {
    return this.handlers.get(actionType);
  }
}
