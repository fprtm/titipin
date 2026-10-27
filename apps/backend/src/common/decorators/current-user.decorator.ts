import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserItem } from '@titipin/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof UserItem | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
