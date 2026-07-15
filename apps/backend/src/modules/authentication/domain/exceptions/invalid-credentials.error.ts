import { AuthenticationDomainError } from './authentication-domain.error.js';

// Deliberately vague — never distinguishes "no such account" from "wrong
// password" (user-enumeration prevention, same reasoning as
// ForgotPasswordUseCase always returning success).
export class InvalidCredentialsError extends AuthenticationDomainError {
  constructor() {
    super('Invalid email or password.');
  }
}
