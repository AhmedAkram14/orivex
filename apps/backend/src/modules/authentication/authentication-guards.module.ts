import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { EnvConfig } from '../../core/configuration/env.schema.js';

import { JWT_SIGNER } from './application/ports/tokens.js';
import { NestjsJwtSigner } from './infrastructure/jwt/nestjs-jwt-signer.js';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from './presentation/guards/roles.guard.js';

// Split out of AuthenticationModule so a module that only needs route
// protection (JwtAuthGuard/RolesGuard) can import this alone, without
// pulling in AuthenticationModule's own TrustModule dependency. That
// dependency matters here because TrustModule imports DoctorModule
// (GetDoctorProfileByIdUseCase) -- if DoctorModule imported the full
// AuthenticationModule for its guards, the module graph would cycle:
// AuthenticationModule -> TrustModule -> DoctorModule -> AuthenticationModule.
// This module has no business-logic dependencies at all (just JWT
// verification), so it can never be part of a cycle like that.
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        secret: configService.get('JWT_ACCESS_SECRET', { infer: true }),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [{ provide: JWT_SIGNER, useClass: NestjsJwtSigner }, JwtAuthGuard, RolesGuard],
  exports: [JWT_SIGNER, JwtAuthGuard, RolesGuard],
})
export class AuthenticationGuardsModule {}
