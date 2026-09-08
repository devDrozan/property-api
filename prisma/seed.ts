import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });

const image = (id: number) => `https://images.unsplash.com/photo-${[1600607687920, 1600566753190, 1600585154340, 1600047509807, 1605146769289, 1600566753086][id % 6]}?auto=format&fit=crop&w=1200&q=85`;
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const categories = [
    ["Apartments", "apartment", "Modern city apartments and condos"], ["Houses", "house", "Family homes and villas"], ["Land", "land", "Residential and commercial plots"],
    ["Condominiums", "condo", "Managed condominium residences"], ["Commercial", "commercial", "Business-ready properties"], ["Office", "office", "Flexible office spaces"], ["Shop house", "shop-house", "Street-facing retail properties"], ["Warehouse", "warehouse", "Storage and logistics space"],
  ];
  const categoryMap: Record<string, string> = {};
  for (const [name, slug, description] of categories) categoryMap[slug] = (await prisma.propertyCategory.upsert({ where: { slug }, update: {}, create: { name, slug, description } })).id;

  const amenityNames = ["Parking", "Elevator", "24/7 Security", "Generator", "Furnished", "Garden", "Air conditioning", "Backup water"];
  const amenityMap: Record<string, string> = {};
  for (const name of amenityNames) amenityMap[slugify(name)] = (await prisma.amenity.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } })).id;

  const cities = [
    { name: "Yangon", slug: "yangon", kind: "CITY", townships: ["Bahan", "Kamayut", "Mayangone", "Dagon", "Sanchaung", "Hlaing"] },
    { name: "Mandalay", slug: "mandalay", kind: "CITY", townships: ["Chanayethazan", "Maha Aung Myay", "Aungmyaythazan", "Chanmyathazi", "Pyigyitagon"] },
  ];
  const locationIds: string[] = [];
  for (const city of cities) {
    const cityRecord = await prisma.location.upsert({ where: { slug: city.slug }, update: {}, create: { name: city.name, slug: city.slug, kind: city.kind } });
    locationIds.push(cityRecord.id);
    for (const township of city.townships) {
      const record = await prisma.location.upsert({ where: { slug: `${city.slug}-${slugify(township)}` }, update: {}, create: { name: township, slug: `${city.slug}-${slugify(township)}`, kind: "TOWNSHIP", parentId: cityRecord.id } });
      locationIds.push(record.id);
    }
  }

  const agency = await prisma.agency.upsert({ where: { slug: "golden-house-realty" }, update: {}, create: { name: "Golden House Realty", slug: "golden-house-realty", description: "A trusted local team across Yangon and Mandalay." } });
  const roles = ["OWNER", "AGENT", "BUYER_RENTER", "STAFF", "ADMIN"] as const;
  for (const role of roles) {
    await prisma.user.upsert({ where: { email: `${role.toLowerCase()}@propertyportal.test` }, update: {}, create: { email: `${role.toLowerCase()}@propertyportal.test`, passwordHash: "demo-password-hash", role, agencyId: role === "AGENT" ? agency.id : undefined, profile: { create: { displayName: role === "BUYER_RENTER" ? "Aye Chan" : `${role[0]}${role.slice(1).toLowerCase()} Demo`, phone: "09 555 0100" } } } });
  }
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@propertyportal.test" } });
  const agent = await prisma.user.findUniqueOrThrow({ where: { email: "agent@propertyportal.test" } });

  const adjectives = ["Sunlit", "Quiet", "Riverfront", "Garden", "Crescent", "Emerald", "Lakeside", "Golden", "Heritage", "Skyline", "Mandalay", "Riverside"];
  const nouns: Record<string, string[]> = { apartment: ["City Apartment", "Corner Residence", "High-floor Home"], house: ["Family Villa", "Townhouse", "Courtyard House"], land: ["Residential Plot", "Development Land", "Corner Land"], condo: ["Serviced Condo", "Lakeview Condo", "Executive Condo"], commercial: ["Commercial Building", "Business Center", "Retail Property"], office: ["Office Suite", "Creative Studio", "Executive Office"], "shop-house": ["Shop House", "Main Road Shop", "Retail Residence"], warehouse: ["Storage Warehouse", "Logistics Hub", "Industrial Space"] };
  let created = 0;
  for (let i = 0; i < 48; i++) {
    const city = cities[i % cities.length];
    const categorySlug = categories[i % categories.length][1];
    const purpose = i % 3 === 0 ? "RENT" : "SALE";
    const townships = city.townships;
    const location = await prisma.location.findUniqueOrThrow({ where: { slug: `${city.slug}-${slugify(townships[i % townships.length])}` } });
    const title = `${adjectives[i % adjectives.length]} ${nouns[categorySlug][i % nouns[categorySlug].length]}`;
    const slug = `${slugify(title)}-${city.slug}-${i + 1}`;
    const listing = await prisma.listing.upsert({ where: { slug }, update: {}, create: { slug, title, description: `A thoughtfully presented ${categorySlug} in ${location.name}, ${city.name}. Enjoy easy access to daily conveniences, established neighborhoods, and a comfortable setting for your next move.`, purpose, status: i % 11 === 0 ? "PENDING_REVIEW" : "PUBLISHED", price: purpose === "RENT" ? 450000 + (i % 7) * 125000 : 85000000 + (i % 9) * 35000000, rentalPeriod: purpose === "RENT" ? "MONTH" : undefined, negotiable: i % 2 === 0, bedrooms: ["land", "commercial", "office", "warehouse"].includes(categorySlug) ? undefined : 1 + (i % 4), bathrooms: ["land"].includes(categorySlug) ? undefined : 1 + (i % 3), areaSqft: 650 + (i % 10) * 180, landAreaSqft: categorySlug === "land" || categorySlug === "house" ? 1200 + (i % 8) * 500 : undefined, parking: i % 3, address: `${12 + i} ${location.name} Township, ${city.name}`, coverImage: image(i), publishedAt: i % 11 === 0 ? undefined : new Date(Date.now() - i * 86400000), ownerId: owner.id, agentId: agent.id, agencyId: agency.id, locationId: location.id, categoryId: categoryMap[categorySlug], media: { create: [0, 1, 2].slice(0, 1 + (i % 3)).map((_, index) => ({ url: image(i + index), altText: `${title} photo ${index + 1}`, sortOrder: index })) }, amenities: { create: amenityNames.slice(i % 4, (i % 4) + 3).map((name) => ({ amenityId: amenityMap[slugify(name)] })) }, statusHistory: { create: [{ to: i % 11 === 0 ? "PENDING_REVIEW" : "PUBLISHED", reason: "Seed data", actorId: agent.id }] } } });
    created++;
    if (i === 0) await prisma.listing.update({ where: { id: listing.id }, data: { status: "PUBLISHED" } });
  }
  console.log(`Seeded ${created} listings across Yangon and Mandalay.`);
}

main().finally(() => prisma.$disconnect());
