import { db } from "./client.js";
import { apps, productApps, products, slotLinks, slots, users } from "./schema.js";

// Datos de ejemplo: el mismo caso del doc de solución (libro recomendado en
// una app de despertador), con un slot de Amazon MX y uno de Mercado Libre AR.
// Idempotente: limpia las tablas antes de insertar, para poder correrlo las
// veces que haga falta sin acumular filas huérfanas ni cambiar el usuario
// "actual" que cachea getCurrentUserId() en el servidor corriendo.
async function seed() {
  await db.delete(slotLinks);
  await db.delete(slots);
  await db.delete(productApps);
  await db.delete(products);
  await db.delete(apps);
  await db.delete(users);

  const [user] = await db
    .insert(users)
    .values({ email: "abel.angel1996@gmail.com" })
    .returning();

  const [despertadorApp] = await db
    .insert(apps)
    .values({
      ownerUserId: user.id,
      nombre: "despertador-app",
      bundleId: "com.abel.despertador",
    })
    .returning();

  const [product] = await db
    .insert(products)
    .values({
      ownerUserId: user.id,
      titulo: "El club de las 5 de la mañana",
      descripcionCorta: "El hábito matutino que puede cambiar tu vida, por Robin Sharma.",
      categoria: "libros",
      imagenUrl: "https://example.com/imagenes/club-de-las-5.jpg",
      imagenAlt: "Portada del libro El club de las 5 de la mañana",
    })
    .returning();

  await db.insert(productApps).values({ productId: product.id, appId: despertadorApp.id });

  const [slotAmazonMx] = await db
    .insert(slots)
    .values({
      productId: product.id,
      provider: "amazon",
      country: "mx",
      status: "active",
    })
    .returning();

  const [slotMlAr] = await db
    .insert(slots)
    .values({
      productId: product.id,
      provider: "mercadolibre",
      country: "ar",
      status: "active",
    })
    .returning();

  await db.insert(slotLinks).values([
    {
      slotId: slotAmazonMx.id,
      affiliateUrl: "https://www.amazon.com.mx/dp/EJEMPLO?tag=tu-tag-21",
      priority: 0,
    },
    {
      slotId: slotMlAr.id,
      affiliateUrl: "https://www.mercadolibre.com.ar/social/tu-usuario?matt_word=EJEMPLO",
      priority: 0,
    },
  ]);

  console.log("Seed cargado:");
  console.log(`  user:  ${user.id}`);
  console.log(`  app:   ${despertadorApp.id} (${despertadorApp.nombre})`);
  console.log(`  product: ${product.id} (${product.titulo})`);
  console.log(`  slot amazon:mx -> ${slotAmazonMx.id}`);
  console.log(`  slot mercadolibre:ar -> ${slotMlAr.id}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
