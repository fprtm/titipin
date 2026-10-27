import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  CustomerItem,
  createCustomerSchema,
  CreateCustomerInput,
  updateCustomerSchema,
  UpdateCustomerInput,
  customerQuerySchema,
  CustomerQueryInput,
} from '@titipin/shared';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(customerQuerySchema)) query: CustomerQueryInput) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<CustomerItem> {
    return this.customersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createCustomerSchema)) dto: CreateCustomerInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<CustomerItem> {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.customersService.create(dto, actorId, { ipAddress, userAgent });
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: UpdateCustomerInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<CustomerItem> {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.customersService.update(id, dto, actorId, { ipAddress, userAgent });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.customersService.delete(id, actorId, { ipAddress, userAgent });
  }
}
