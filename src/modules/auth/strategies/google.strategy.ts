import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  authorizationParams(): Record<string, string> {
    return {
      prompt: 'select_account',
    };
  }

  async validate(
    accessToken: string,

    refreshToken: string | undefined,

    profile: Profile,
  ) {
    return this.authService.validateGoogleUser(profile);
  }
}
