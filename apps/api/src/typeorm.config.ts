import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from the root .env file
config({ path: join(process.cwd(), '.env') });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(process.cwd(), 'apps/api/src/**/*.entity.{ts,js}')],
  migrations: [join(process.cwd(), 'apps/api/src/migrations/*.{ts,js}')],
  synchronize: false,
});
