/**
 * Mock-data seeder.
 *
 *   bun run seed                  # 10 rows in every table (default)
 *   bun run seed --100            # 100 rows in every table
 *   bun run seed customers --100  # 100 rows, customers only
 *   bun run seed contacts properties --50 --user=<userId>
 *
 * Positional args pick which tables to seed (contacts | customers |
 * properties); with none, all are seeded. Every row is attached to a single
 * owning user (defaults to the id below). The user must already exist — the
 * seeder never creates users.
 */
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { db } from './index';
import {
  contactKindEnum,
  contacts,
  customers,
  properties,
  propertyCurrencyEnum,
  propertyPurposeEnum,
  propertyTypeEnum,
  user,
  workerRoleEnum,
} from './schema';

const DEFAULT_USER_ID = '0cRgEVahcacVJgaCHsr6qf3WGIcgmiuu';

const SEEDABLE_TABLES = ['contacts', 'customers', 'properties'] as const;
type SeedableTable = (typeof SEEDABLE_TABLES)[number];

function parseArgs() {
  let count = 10;
  let userId = DEFAULT_USER_ID;
  const requested = new Set<SeedableTable>();
  for (const arg of process.argv.slice(2)) {
    const numMatch = arg.match(/^--(\d+)$/);
    if (numMatch) {
      count = Number(numMatch[1]);
      continue;
    }
    const countMatch = arg.match(/^--count=(\d+)$/);
    if (countMatch) {
      count = Number(countMatch[1]);
      continue;
    }
    const userMatch = arg.match(/^--user=(.+)$/);
    if (userMatch) {
      userId = userMatch[1];
      continue;
    }
    if ((SEEDABLE_TABLES as readonly string[]).includes(arg)) {
      requested.add(arg as SeedableTable);
      continue;
    }
    console.error(`✗ unknown argument "${arg}" (tables: ${SEEDABLE_TABLES.join(', ')})`);
    process.exit(1);
  }
  // no table named → seed all of them
  const tables = requested.size ? requested : new Set<SeedableTable>(SEEDABLE_TABLES);
  return { count, userId, tables };
}

const pick = <T>(arr: readonly T[]): T => arr[faker.number.int({ min: 0, max: arr.length - 1 })];
const maybe = <T>(value: T, chance = 0.6): T | null => (faker.datatype.boolean(chance) ? value : null);

// Rough bounding box over Afghanistan.
const afLat = () => faker.location.latitude({ min: 29, max: 38.5, precision: 6 });
const afLng = () => faker.location.longitude({ min: 60, max: 74.9, precision: 6 });
const afPhone = () => `07${faker.string.numeric(8)}`;

function buildContacts(userId: string, n: number) {
  return Array.from({ length: n }, () => {
    const kind = pick(contactKindEnum.enumValues);
    const isWorker = kind === 'worker';
    return {
      userId,
      name: faker.person.fullName(),
      kind,
      role: isWorker ? pick(workerRoleEnum.enumValues) : null,
      note: isWorker ? maybe(faker.lorem.sentence(), 0.5) : null,
      phoneCountryIso: 'AF',
      phone: afPhone(),
      whatsappCountryIso: maybe('AF', 0.5),
      whatsapp: maybe(afPhone(), 0.5),
    };
  });
}

function buildCustomers(userId: string, n: number) {
  return Array.from({ length: n }, () => {
    const hasWhatsapp = faker.datatype.boolean();
    return {
      userId,
      name: faker.person.fullName(),
      requirement: maybe(faker.lorem.sentence(), 0.7) ?? '',
      interestedPropertyType: maybe(pick(propertyTypeEnum.enumValues)),
      interestedPurpose: maybe(pick(propertyPurposeEnum.enumValues)),
      phoneCountryIso: 'AF',
      // guarantee at least one contact method: phone unless whatsapp is set
      phone: hasWhatsapp ? maybe(afPhone(), 0.5) ?? afPhone() : afPhone(),
      whatsappCountryIso: hasWhatsapp ? 'AF' : null,
      whatsapp: hasWhatsapp ? afPhone() : null,
    };
  });
}

function buildProperties(userId: string, n: number) {
  return Array.from({ length: n }, () => {
    const hasWhatsapp = faker.datatype.boolean();
    return {
      userId,
      ownerName: faker.person.fullName(),
      ownerPhoneCountryIso: 'AF',
      // guarantee at least one contact method: phone unless whatsapp is set
      ownerPhone: hasWhatsapp ? maybe(afPhone(), 0.5) ?? afPhone() : afPhone(),
      ownerWhatsappCountryIso: hasWhatsapp ? 'AF' : null,
      ownerWhatsapp: hasWhatsapp ? afPhone() : null,
      code: maybe(`P-${faker.string.alphanumeric(6).toUpperCase()}`, 0.4),
      propertyType: pick(propertyTypeEnum.enumValues),
      purpose: pick(propertyPurposeEnum.enumValues),
      price: faker.number.int({ min: 5_000, max: 5_000_000 }),
      currency: pick(propertyCurrencyEnum.enumValues),
      address: maybe(faker.location.streetAddress(), 0.7),
      latitude: afLat(),
      longitude: afLng(),
      bedrooms: maybe(faker.number.int({ min: 1, max: 8 })),
      bathrooms: maybe(faker.number.int({ min: 1, max: 5 })),
      floors: maybe(faker.number.int({ min: 1, max: 6 })),
      kitchens: maybe(faker.number.int({ min: 1, max: 3 })),
      buildingSize: maybe(faker.number.int({ min: 50, max: 1200 })),
      buildingSizeUnit: pick(['sqm', 'sqft'] as const),
      landSize: maybe(faker.number.int({ min: 100, max: 5000 })),
      landSizeUnit: pick(['sqm', 'sqft'] as const),
      yearBuilt: maybe(faker.number.int({ min: 1980, max: 2025 })),
      description: faker.lorem.paragraph(),
    };
  });
}

async function main() {
  const { count, userId, tables } = parseArgs();

  const owner = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!owner) {
    console.error(`✗ user "${userId}" not found — create the user first, then re-run.`);
    process.exit(1);
  }

  console.log(
    `Seeding ${count} rows for user ${userId} (${owner.email}) — ${[...tables].join(', ')}\n`,
  );

  if (tables.has('contacts')) {
    const rows = await db.insert(contacts).values(buildContacts(userId, count)).returning();
    console.log(`  contacts   +${rows.length}`);
  }

  if (tables.has('customers')) {
    const rows = await db.insert(customers).values(buildCustomers(userId, count)).returning();
    console.log(`  customers  +${rows.length}`);
  }

  if (tables.has('properties')) {
    const rows = await db.insert(properties).values(buildProperties(userId, count)).returning();
    console.log(`  properties +${rows.length}`);
  }

  console.log('\n✓ done');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
