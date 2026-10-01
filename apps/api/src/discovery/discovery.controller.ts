import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiscoveryService } from './discovery.service';
import {
  DiscoverySearchDto,
  NearbyDto,
  HomeSectionsDto,
  SuggestionsDto,
} from './dto/search.dto';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search businesses, professionals, services, and categories' })
  async search(@Query() dto: DiscoverySearchDto) {
    return this.discoveryService.search(dto);
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby businesses within radius' })
  async nearby(@Query() dto: NearbyDto) {
    return this.discoveryService.getNearby(dto);
  }

  @Public()
  @Get('available-now')
  @ApiOperation({ summary: 'Get businesses available now' })
  async availableNow(@Query() dto: NearbyDto) {
    return this.discoveryService.getAvailableNow(dto);
  }

  @Public()
  @Get('home')
  @ApiOperation({ summary: 'Get home page discovery sections' })
  async home(@Query() dto: HomeSectionsDto, @CurrentUser() user?: { id: string }) {
    return this.discoveryService.getHomeSections({ ...dto, userId: user?.id });
  }

  @Public()
  @Get('search/suggestions')
  @ApiOperation({ summary: 'Get search typeahead suggestions' })
  async suggestions(@Query() dto: SuggestionsDto) {
    return this.discoveryService.getSuggestions(dto.q, dto.limit);
  }

  @Get('search/history')
  @ApiOperation({ summary: 'Get current user search history' })
  async getHistory(@CurrentUser() user: { id: string }) {
    return this.discoveryService.getSearchHistory(user.id);
  }

  @Post('search/history')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add entry to search history' })
  async addHistory(
    @CurrentUser() user: { id: string },
    @Body() body: { query: string; entityType?: string },
  ) {
    return this.discoveryService.addToSearchHistory(user.id, body.query, body.entityType);
  }

  @Delete('search/history')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all search history for current user' })
  async clearHistory(@CurrentUser() user: { id: string }) {
    await this.discoveryService.clearSearchHistory(user.id);
  }

  @Delete('search/history/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove single search history entry' })
  async removeHistory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.discoveryService.removeFromSearchHistory(user.id, id);
  }
}
