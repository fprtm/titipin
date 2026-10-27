import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  createOrderSchema,
  CreateOrderInput,
  checkoutOrderSchema,
  CheckoutOrderInput,
  holdOrderSchema,
  HoldOrderInput,
  orderQuerySchema,
  OrderQueryInput,
} from '@titipin/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  async findAll(@Query(new ZodValidationPipe(orderQuerySchema)) query: OrderQueryInput) {
    return this.ordersService.findAll(query);
  }

  // POST /api/orders (Primary POS Checkout)
  @Post()
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderInput,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.checkout(dto, cashierId, { ipAddress, userAgent });
  }

  // POST /api/orders/checkout (Alias)
  @Post('checkout')
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Body(new ZodValidationPipe(checkoutOrderSchema)) dto: CheckoutOrderInput,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.checkout(dto, cashierId, { ipAddress, userAgent });
  }

  // POST /api/orders/hold
  @Post('hold')
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  async hold(
    @Body(new ZodValidationPipe(holdOrderSchema)) dto: HoldOrderInput,
    @CurrentUser('id') cashierId: string,
  ) {
    return this.ordersService.hold(dto, cashierId);
  }

  // GET /api/orders/held
  @Get('held')
  @Roles(Role.ADMIN, Role.CASHIER)
  async getHeld(@CurrentUser('id') cashierId: string) {
    return this.ordersService.getDraft(cashierId);
  }

  // GET /api/orders/draft
  @Get('draft')
  @Roles(Role.ADMIN, Role.CASHIER)
  async getDraft(@CurrentUser('id') cashierId: string) {
    return this.ordersService.getDraft(cashierId);
  }

  // DELETE /api/orders/held
  @Delete('held')
  @Roles(Role.ADMIN, Role.CASHIER)
  async discardHeld(@CurrentUser('id') cashierId: string) {
    return this.ordersService.discardDraft(cashierId);
  }

  // DELETE /api/orders/draft
  @Delete('draft')
  @Roles(Role.ADMIN, Role.CASHIER)
  async discardDraft(@CurrentUser('id') cashierId: string) {
    return this.ordersService.discardDraft(cashierId);
  }

  // POST /api/orders/held/finalize
  @Post('held/finalize')
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  async finalizeHeld(
    @Body() dto: CreateOrderInput | undefined,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.finalizeDraft(cashierId, dto, { ipAddress, userAgent });
  }

  // POST /api/orders/draft/finalize
  @Post('draft/finalize')
  @Roles(Role.ADMIN, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  async finalizeDraft(
    @Body() dto: CreateOrderInput | undefined,
    @CurrentUser('id') cashierId: string,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.finalizeDraft(cashierId, dto, { ipAddress, userAgent });
  }

  // GET /api/orders/:id (MUST be declared after static sub-paths)
  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }
}
