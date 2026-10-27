import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  UserItem,
  createUserSchema,
  CreateUserInput,
  resetPasswordSchema,
  ResetPasswordInput,
} from '@titipin/shared';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserItem[]> {
    return this.usersService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<UserItem> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.usersService.create(dto, actorId, { ipAddress, userAgent });
  }

  @Patch(':id/reset-password')
  async resetPassword(
    @Param('id', new ParseUUIDPipe()) targetId: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.usersService.resetPassword(targetId, dto, actorId, {
      ipAddress,
      userAgent,
    });
  }

  @Delete(':id')
  async deactivate(
    @Param('id', new ParseUUIDPipe()) targetId: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.usersService.deactivate(targetId, actorId, {
      ipAddress,
      userAgent,
    });
  }
}
