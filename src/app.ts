import cors from "cors";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "2mb" }));

const listingInclude = {
  location: true,
  category: true,
  media: { orderBy: { sortOrder: "asc" as const } },
  amenities: { include: { amenity: true } },
  agent: { include: { profile: true, agency: true } },
  owner: { include: { profile: true } },
};

const toListing = (listing: any) => ({
  id: listing.id,
  slug: listing.slug,
  title: listing.title,
  description: listing.description,
  purpose: listing.purpose.toLowerCase(),
  status: listing.status.toLowerCase(),
  price: listing.price,
  currency: listing.currency,
  rentalPeriod: listing.rentalPeriod,
  negotiable: listing.negotiable,
  bedrooms: listing.bedrooms,
  bathrooms: listing.bathrooms,
  areaSqft: listing.areaSqft,
  landAreaSqft: listing.landAreaSqft,
  parking: listing.parking,
  address: listing.address,
  coverImage: listing.coverImage,
  location: listing.location,
  category: listing.category,
  amenities: listing.amenities?.map((item: any) => item.amenity) ?? [],
  media: listing.media ?? [],
  contact: listing.agent?.profile ?? listing.owner?.profile ?? null,
  agency: listing.agent?.agency ?? null,
  publishedAt: listing.publishedAt,
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "property-portal-api" }));

app.get("/api/v1/meta", async (_req, res, next) => {
  try {
    const [locations, categories, amenities] = await Promise.all([
      prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.propertyCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    ]);
    res.json({ locations, categories, amenities });
  } catch (error) { next(error); }
});

app.get("/api/v1/listings", async (req, res, next) => {
  try {
    const query = z.object({
      q: z.string().trim().optional(),
      purpose: z.enum(["sale", "rent"]).optional(),
      city: z.string().trim().optional(),
      category: z.string().trim().optional(),
      minPrice: z.coerce.number().int().nonnegative().optional(),
      maxPrice: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(24),
    }).parse(req.query);

    const where: any = { status: "PUBLISHED" };
    if (query.purpose) where.purpose = query.purpose.toUpperCase();
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = { ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}) };
    }
    if (query.city) where.location = { name: { contains: query.city } };
    if (query.category) where.category = { slug: query.category };
    if (query.q) where.OR = [{ title: { contains: query.q } }, { description: { contains: query.q } }, { address: { contains: query.q } }];

    const listings = await prisma.listing.findMany({ where, include: listingInclude, orderBy: { publishedAt: "desc" }, take: query.limit });
    res.json({ data: listings.map(toListing), total: listings.length });
  } catch (error) { next(error); }
});

app.get("/api/v1/listings/:slug", async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { slug: req.params.slug }, include: listingInclude });
    if (!listing || listing.status !== "PUBLISHED") return res.status(404).json({ error: "Listing not found" });
    res.json({ data: toListing(listing) });
  } catch (error) { next(error); }
});

const createListingSchema = z.object({
  title: z.string().min(8), description: z.string().min(30), purpose: z.enum(["SALE", "RENT"]),
  price: z.number().int().positive(), categoryId: z.string(), locationId: z.string(), address: z.string().min(4),
  coverImage: z.string().url(), bedrooms: z.number().int().nonnegative().optional(), bathrooms: z.number().int().nonnegative().optional(),
});

app.post("/api/v1/listings", async (req, res, next) => {
  try {
    const payload = createListingSchema.parse(req.body);
    const demoUser = await prisma.user.findFirst({ where: { role: "AGENT" } });
    if (!demoUser) return res.status(503).json({ error: "Seed an agent before creating listings" });
    const slug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    const listing = await prisma.listing.create({ data: { ...payload, slug, agentId: demoUser.id, status: "PENDING_REVIEW" }, include: listingInclude });
    res.status(201).json({ data: toListing(listing) });
  } catch (error) { next(error); }
});

app.use((error: any, _req: Request, res: Response, _next: express.NextFunction) => {
  if (error?.name === "ZodError") return res.status(400).json({ error: "Invalid request", details: error.issues });
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
