import { Role } from '../../users/role.enum';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  lastname: string;
  phone: string;
}
