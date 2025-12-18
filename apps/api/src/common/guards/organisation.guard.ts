import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class OrganisationGuard implements CanActivate {
    constructor() { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Get organisation ID from header OR from URL param
        let organisationId = request.headers['x-organisation-id'];

        // Also check URL params (for routes like /organisations/:organisationId/...)
        if (!organisationId && request.params?.organisationId) {
            organisationId = request.params.organisationId;
        }

        if (!organisationId) {
            throw new UnauthorizedException('Organisation context required');
        }

        if (!user) {
            throw new UnauthorizedException('User not authenticated');
        }

        // Validate if user belongs to this organisation
        // Super Admins can access any organisation
        if (user.role === 'SUPER_ADMIN') {
            request.organisationId = organisationId;
            return true;
        }

        if (user.organisationId !== organisationId) {
            throw new ForbiddenException('You do not have access to this organisation');
        }

        // Attach to request for controllers
        request.organisationId = organisationId;
        return true;
    }
}
