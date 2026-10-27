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
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BypassTransform } from '../../common/decorators/bypass-transform.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  ProductItem,
  createProductSchema,
  CreateProductSchemaInput,
  updateProductSchema,
  UpdateProductSchemaInput,
  productQuerySchema,
  ProductQueryInput,
  ImportSummaryResponse,
} from '@titipin/shared';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(productQuerySchema)) query: ProductQueryInput) {
    return this.productsService.findAll(query);
  }

  @Get('export')
  @BypassTransform()
  async export(@Res() res: Response) {
    const buffer = await this.productsService.exportToExcel();
    const filename = `katalog-produk-${Date.now()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }

  @Post('import')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<ImportSummaryResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Berkas spreadsheet wajib diunggah');
    }
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const summary = await this.productsService.importFromSpreadsheet(file.buffer, actorId, {
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Import produk berhasil diselesaikan',
      data: summary,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ProductItem> {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductSchemaInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<ProductItem> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.productsService.create(dto, actorId, { ipAddress, userAgent });
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductSchemaInput,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<ProductItem> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.productsService.update(id, dto, actorId, { ipAddress, userAgent });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.productsService.delete(id, actorId, { ipAddress, userAgent });
  }
}
