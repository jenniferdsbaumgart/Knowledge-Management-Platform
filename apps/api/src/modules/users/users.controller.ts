import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard, OrganisationGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganisationGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'List users in the organisation' })
    async findAll(@Request() req: any) {
        return this.usersService.findAll(req.organisationId);
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get user by ID' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.usersService.findOne(id, req.organisationId);
    }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new user' })
    async create(@Body() dto: CreateUserDto, @Request() req: any) {
        return this.usersService.create(dto, req.user, req.organisationId);
    }

    @Put(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update a user' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
        @Request() req: any,
    ) {
        return this.usersService.update(id, dto, req.user, req.organisationId);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a user' })
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.usersService.remove(id, req.user, req.organisationId);
    }
}
